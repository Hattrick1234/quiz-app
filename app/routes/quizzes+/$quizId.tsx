import { type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData, useFetcher } from '@remix-run/react'
import { type ChangeEvent, useState } from 'react'
import { getQuizById, getQuestionsByQuizId } from '#app/data/quiz.server.ts'
import { type QuestionSummary } from '#app/types/index.ts'
import { requireUserId } from '#app/utils/auth.server.js'

// Define a new type that matches the structure of the returned questions
type LoaderData = {
	quizId: string
	questions: QuestionSummary[]
}

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const quizId = params.quizId

	if (!quizId) {
		throw new Response('Quiz ID is required', { status: 400 })
	}

	const quiz = await getQuizById(userId, quizId)

	if (!quiz) {
		throw new Response('Quiz not found for the specified user', { status: 404 })
	}

	const questions = await getQuestionsByQuizId(quizId)

	if (!questions) {
		throw new Response('Questions not found', { status: 404 })
	}

	return { quizId, questions }
}

export default function UsersRoute() {
	const { quizId, questions } = useLoaderData<LoaderData>()
	const fetcher = useFetcher()

	const [isEditing, setIsEditing] = useState(false)
	const [editableQuestions, setEditableQuestions] = useState<QuestionSummary[]>(
		[...questions],
	)

	const handleEditClick = () => {
		setIsEditing(true)
	}

	const handleSaveClick = async () => {
		setIsEditing(false)

		// Save the updated questions to the server
		const formData = new FormData()
		formData.append('quizId', quizId)
		formData.append('questions', JSON.stringify(editableQuestions))

		fetcher.submit(formData, {
			method: 'post',
			action: '/api/update-questions',
		})
	}

	const handleChange = (
		e: ChangeEvent<HTMLInputElement>,
		index: number,
		field: keyof QuestionSummary,
	) => {
		const newQuestions = [...editableQuestions]
		newQuestions[index] = {
			...newQuestions[index],
			[field]: e.target.value,
		} as QuestionSummary
		setEditableQuestions(newQuestions)
	}

	return (
		<div className="container mx-auto px-4">
			<h1 className="my-4 text-2xl font-bold">De vragen en antwoorden:</h1>
			<table id="question-list" className="min-w-full divide-y divide-gray-200">
				<thead className="bg-gray-50">
					<tr>
						<th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							Question
						</th>
						<th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
							Answer
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-200 bg-white">
					{editableQuestions.map((question, index) => (
						<tr key={question.id} className="question">
							<td className="whitespace-nowrap px-6 py-4">
								{isEditing ? (
									<input
										type="text"
										value={question.question}
										onChange={e => handleChange(e, index, 'question')}
										className="w-full rounded border px-2 py-1"
									/>
								) : (
									question.question
								)}
							</td>
							<td className="whitespace-nowrap px-6 py-4">
								{isEditing ? (
									<input
										type="text"
										value={question.answer}
										onChange={e => handleChange(e, index, 'answer')}
										className="w-full rounded border px-2 py-1"
									/>
								) : (
									question.answer
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<div className="my-4">
				{isEditing ? (
					<button
						onClick={handleSaveClick}
						className="rounded bg-green-500 px-4 py-2 text-white"
					>
						Save
					</button>
				) : (
					<button
						onClick={handleEditClick}
						className="rounded bg-blue-500 px-4 py-2 text-white"
					>
						Edit
					</button>
				)}
			</div>
			<div className="my-4">
				<Link to="/quizzes" className="text-blue-500 hover:underline">
					Terug naar quizzes
				</Link>
			</div>
		</div>
	)
}
