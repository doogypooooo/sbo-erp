import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

// Global search endpoint
router.get('/', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ message: 'Search query is required.' });
    }
    const results = await storage.globalSearch(query);
    res.json(results);
  } catch (error) {
    console.error('Error performing global search:', error);
    res.status(500).json({ message: 'Failed to perform search.' });
  }
});

export default router; 