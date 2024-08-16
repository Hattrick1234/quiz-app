// routes/api/update-questions.ts

import { json } from '@remix-run/node'
import { updateQuestions, addQuestion } from '#app/data/quiz.server.ts'
import { type QuestionSummary } from '#app/types'

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
		return json(
			{ error: 'Failed to parse questions', details: (error as Error).message },
			{ status: 400 },
		)
	}

	const updatePromises = questions.map(question => {
		if (question.id) {
			return updateQuestions(quizId, [question])
		} else {
			return addQuestion(quizId, question)
		}
	})

	try {
		await Promise.all(updatePromises)
		return json({ success: true })
	} catch (error) {
		return json(
			{
				error: 'Failed to update questions',
				details: (error as Error).message,
			},
			{ status: 500 },
		)
	}
}
