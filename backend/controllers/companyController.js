const { PUBLIC_APPROVAL_FILTER } = require('../utils/jobVisibility');
const Company = require('../models/Company');
const Job = require('../models/Job');
const { sanitizeFields } = require('../utils/sanitize');

exports.listCompanies = async (req, res, next) => {
  try {
    const companies = await Company.find(req.query.verified ? { isVerified: req.query.verified === 'true' } : {});
    res.json({ companies });
  } catch (err) { next(err); }
};

exports.createCompany = async (req, res, next) => {
  try {
    const { name, domain, industry, size, locations } = req.body;
    const companyData = sanitizeFields({ name, domain, industry, size, locations }, ['name', 'domain', 'industry']);
    const company = await Company.create(companyData);
    res.status(201).json({ company });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Company already exists' });
    next(err);
  }
};

// GET /api/companies/:id/intelligence — hiring trend, turnover signals, salary distribution
exports.getIntelligence = async (req, res, next) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });

    const activeJobCount = await Job.countDocuments({ company: company._id, status: 'active', ...PUBLIC_APPROVAL_FILTER });
    res.json({
      company: company.name,
      isVerified: company.isVerified,
      activeJobCount,
      hiringTrend: company.hiringTrend,
      turnoverSignals: company.turnoverSignals,
      salaryDistribution: company.salaryDistribution,
      interviewProcess: company.interviewProcess
    });
  } catch (err) { next(err); }
};

// PATCH /api/companies/:id/verify (admin) — trust & verification
exports.verifyCompany = async (req, res, next) => {
  try {
    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { isVerified: true, verificationNotes: req.body.notes },
      { new: true }
    );
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ company });
  } catch (err) { next(err); }
};
