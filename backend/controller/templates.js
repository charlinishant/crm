const express = require('express');
const router = express.Router();

/**
 * @route   POST /api/templates
 * @desc    Create a new document template
 * @access  Private (Admin)
 */
router.post('/', async (req, res) => {
  // --- LOGIC FOR CREATING A DOCUMENT TEMPLATE ---
  // Corresponds to section 5.1 of the specification.
  // Admin can create/edit templates in a rich editor.
  const { type, name, htmlBody, letterhead } = req.body;
  const newTemplate = await req.prisma.documentTemplate.create({
    data: { type, name, htmlBody, letterhead },
  });
  res.json(newTemplate);
});

/**
 * @route   GET /api/templates
 * @desc    Get all document templates
 * @access  Private
 */
router.get('/', async (req, res) => {
  // --- LOGIC FOR FETCHING ALL TEMPLATES ---
  const templates = await req.prisma.documentTemplate.findMany();
  res.json(templates);
});

/**
 * @route   PUT /api/templates/:id
 * @desc    Update a document template (creates a new version)
 * @access  Private (Admin)
 */
router.put('/:id', async (req, res) => {
  // --- LOGIC FOR UPDATING A TEMPLATE ---
  // This would involve creating a new version of the template.
  res.json({ msg: 'Template update logic to be implemented.' });
});

module.exports = router;