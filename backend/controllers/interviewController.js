const InterviewSession = require('../models/InterviewSession');
const Job = require('../models/Job');
const { generateQuestionSet } = require('../utils/interviewQuestionBank');
const { generateAdaptiveQuestion } = require('../utils/adaptiveInterview');
const { analyzeAnswer } = require('../utils/interviewFeedback');
const { callLLM, isLLMConfigured } = require('../utils/llm');

const TARGET_QUESTIONS = 5;

exports.startInterview = async (req, res, next) => {
  try {
    const job = await Job.findById(req.body.jobId);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    // Keep recent questions out of the initial pool so repeated practice on the same
    // role is less repetitive even when no LLM key is configured.
    const recentSessions = await InterviewSession.find({ candidate: req.user._id, job: job._id })
      .sort({ startedAt: -1 }).limit(3).select('questions').lean();
    const recentTexts = new Set(recentSessions.flatMap(s => s.questions || []).map(q => q.text?.toLowerCase()));

    const firstPool = generateQuestionSet(job, { technicalCount: 1, behavioralCount: 0, situationalCount: 0 });
    let firstQuestion = firstPool.find(q => !recentTexts.has(q.text.toLowerCase())) || firstPool[0];

    if (isLLMConfigured()) {
      firstQuestion = await generateAdaptiveQuestion({
        job,
        transcript: [],
        previousQuestions: recentSessions.flatMap(s => s.questions || []),
        callLLM
      });
    }

    if (!firstQuestion) return res.status(400).json({ error: 'Could not generate interview questions for this job.' });

    const session = await InterviewSession.create({
      candidate: req.user._id,
      job: job._id,
      questions: [firstQuestion],
      answers: [],
      targetQuestionCount: TARGET_QUESTIONS
    });

    res.status(201).json({
      sessionId: session._id,
      totalQuestions: TARGET_QUESTIONS,
      currentQuestion: {
        questionId: firstQuestion.questionId,
        text: firstQuestion.text,
        type: firstQuestion.type,
        difficulty: firstQuestion.difficulty || 'medium'
      },
      mode: isLLMConfigured() ? 'adaptive-ai' : 'adaptive-bank'
    });
  } catch (err) { next(err); }
};

exports.submitAnswer = async (req, res, next) => {
  try {
    const session = await InterviewSession.findOne({ _id: req.params.id, candidate: req.user._id });
    if (!session) return res.status(404).json({ error: 'Interview session not found' });
    if (session.status !== 'in-progress') return res.status(400).json({ error: `This session is already ${session.status}.` });

    const { answer } = req.body;
    if (!answer || !answer.trim()) return res.status(400).json({ error: 'answer is required' });

    const answeredCount = session.answers.length;
    const askedQuestion = session.questions[answeredCount];
    if (!askedQuestion) return res.status(400).json({ error: 'No more questions in this session' });

    const feedback = await analyzeAnswer(
      { type: askedQuestion.type, skillTag: askedQuestion.skillTag, text: askedQuestion.text },
      answer,
      {
        callLLM: isLLMConfigured() ? callLLM : null,
        context: {
          jobTitle: session.job?.title,
          difficulty: askedQuestion.difficulty,
          previousAnswers: session.answers.slice(-3).map(a => ({ text: a.text, score: a.feedback?.score }))
        }
      }
    );

    const nextIndex = answeredCount + 1;
    let nextQuestion = null;
    if (nextIndex < session.targetQuestionCount) {
      const transcript = session.questions.slice(0, answeredCount + 1).map((q, i) => ({
        question: q.text,
        questionType: q.type,
        answer: i === answeredCount ? answer : session.answers[i]?.text || '',
        score: i === answeredCount ? feedback.score : session.answers[i]?.feedback?.score
      }));
      const job = await Job.findById(session.job).select('title requiredSkills').lean();
      nextQuestion = await generateAdaptiveQuestion({
        job,
        transcript,
        previousQuestions: session.questions,
        callLLM: isLLMConfigured() ? callLLM : null
      });
    }

    const update = {
      $push: { answers: { questionId: askedQuestion.questionId, text: answer, feedback } }
    };
    if (nextQuestion) update.$push.questions = nextQuestion;

    const updated = await InterviewSession.findOneAndUpdate(
      {
        _id: session._id,
        candidate: req.user._id,
        status: 'in-progress',
        $expr: { $eq: [{ $size: '$answers' }, answeredCount] }
      },
      update,
      { new: true }
    );

    if (!updated) {
      return res.status(409).json({ error: 'This session changed while your answer was being processed. Please retry.' });
    }

    const responseBody = { feedback };
    if (nextQuestion) {
      responseBody.nextQuestion = {
        questionId: nextQuestion.questionId,
        text: nextQuestion.text,
        type: nextQuestion.type,
        difficulty: nextQuestion.difficulty || 'medium'
      };
      responseBody.progress = { answered: nextIndex, total: updated.targetQuestionCount };
    } else {
      const scores = updated.answers.map(a => a.feedback?.score).filter(s => typeof s === 'number');
      updated.status = 'completed';
      updated.completedAt = new Date();
      updated.overallScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      updated.summary = summarize(updated.answers);
      await updated.save();
      responseBody.completed = true;
      responseBody.overallScore = updated.overallScore;
      responseBody.summary = updated.summary;
    }

    res.json(responseBody);
  } catch (err) { next(err); }
};

function summarize(answers) {
  const allStrengths = answers.flatMap(a => a.feedback?.strengths || []);
  const allImprovements = answers.flatMap(a => a.feedback?.improvements || []);
  return {
    strengths: [...new Set(allStrengths)].slice(0, 5),
    improvements: [...new Set(allImprovements)].slice(0, 5)
  };
}

exports.getSession = async (req, res, next) => {
  try {
    const session = await InterviewSession.findOne({ _id: req.params.id, candidate: req.user._id }).populate('job', 'title requiredSkills');
    if (!session) return res.status(404).json({ error: 'Interview session not found' });
    res.json({ session });
  } catch (err) { next(err); }
};

exports.myInterviews = async (req, res, next) => {
  try {
    const sessions = await InterviewSession.find({ candidate: req.user._id })
      .populate('job', 'title')
      .sort({ startedAt: -1 })
      .select('candidate job status overallScore startedAt completedAt targetQuestionCount');
    res.json({ sessions });
  } catch (err) { next(err); }
};
