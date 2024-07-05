// routes/api/update-questions.ts

import { json } from '@remix-run/node'
import { updateQuestions } from '#app/data/quiz.server.ts'
import { type QuestionSummary } from '#app/types/index.ts'

export async function action({ request }: { request: Request }) {
	const formData = await request.formData()
	const quizId = formData.get('quizId') as string
	const questionsString = formData.get('questions') as string

	if (!quizId || !questionsString) {
		return json({ error: 'Invalid data' }, { status: 400 })
	}

	let questions: QuestionSummary[]
	try {
		questions = JSON.parse(questionsString) as QuestionSummary[]
	} catch (error) {
		console.error('Failed to parse questions:', error)
		return json({ error: 'Failed to parse questions' }, { status: 400 })
	}

	try {
		await updateQuestions(quizId, questions)
		return json({ success: true })
	} catch (error) {
		console.error('Failed to parse questions:', error)
		return json({ error: 'Failed to update questions' }, { status: 500 })
	}
}
