import { Request, Response } from 'express'
import { answerQuestion } from '../../agents/rag-agent'

export async function handleChat(req: Request, res: Response) {
  const { documentId, question, history } = req.body
  try {
    const result = await answerQuestion({ documentId, question, history })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: 'Failed to answer question', details: String(err) })
  }
}
