import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData, Form, useNavigate } from '@remix-run/react'
import { type ChangeEvent, useState } from 'react'
import {
	getQuizById,
	getQuestionsByQuizId,
	updateQuestions,
	addQuestion,
	deleteQuestions,
} from '#app/data/quiz.server.ts'
import { type QuestionSummary } from '#app/types/index.ts'
import { requireUserId } from '#app/utils/auth.server.js'

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

export async function action({ request }: LoaderFunctionArgs) {
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

	// IDs van bestaande vragen in de database ophalen
	const existingQuestionsIds = (await getQuestionsByQuizId(quizId)).map(
		q => q.id,
	)

	console.log(questions)
	// Nieuwe en bestaande vragen scheiden
	//als de question een id heeft bestaat hij al dan updaten, zo niet dan toevoegen
	const updatePromises = questions.map(question => {
		if (question.id) {
			return updateQuestions(quizId, [question])
		} else {
			return addQuestion(quizId, question)
		}
	})

	// Verwijderde vragen identificeren en verwijderen
	const submittedQuestionIds = questions
		.map(q => q.id)
		.filter(Boolean) as string[]
	const deletePromises = existingQuestionsIds
		.filter(id => !submittedQuestionIds.includes(id))
		.map(id => deleteQuestions(id))

	try {
		//await Promise.all(updatePromises)
		await Promise.all([...updatePromises, ...deletePromises])
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

export default function QuizEditRoute() {
	const { quizId, questions } = useLoaderData<typeof loader>()

	const [isEditing, setIsEditing] = useState(false)
	const [editableQuestions, setEditableQuestions] =
		useState<QuestionSummary[]>(questions)
	const navigate = useNavigate()

	const handleEditClick = () => {
		setIsEditing(true)
	}

	const handleCancelClick = () => {
		setEditableQuestions(questions) // Reset editable questions to the original loaded questions
		setIsEditing(false) // Exit editing mode
	}

	const handleChange = (
		e: ChangeEvent<HTMLInputElement>,
		index: number,
		field: keyof QuestionSummary,
	) => {
		// const newQuestions = [...editableQuestions]
		// newQuestions[index] = { ...newQuestions[index], [field]: e.target.value }
		const newQuestions = [...editableQuestions]
		newQuestions[index] = {
			...newQuestions[index],
			[field]: e.target.value,
		} as QuestionSummary
		setEditableQuestions(newQuestions)
	}

	const handleAddClick = () => {
		const newQuestion: QuestionSummary = {
			id: '', // Temporary ID, will be replaced by the actual ID from the database
			question: '',
			answer: '',
		}
		setEditableQuestions([...editableQuestions, newQuestion])
	}

	const handleDeleteClick = (index: number) => {
		const newQuestions = editableQuestions.filter((_, i) => i !== index)
		setEditableQuestions(newQuestions)
	}

	const handleDeleteAllClick = () => {
		setEditableQuestions([])
	}

	return (
		<div className="container mx-auto px-4">
			<h1 className="my-4 text-2xl font-bold">De vragen en antwoorden:</h1>
			<Form method="post">
				<input type="hidden" name="quizId" value={quizId} />
				<input
					type="hidden"
					name="questions"
					value={JSON.stringify(editableQuestions)}
				/>
				<table
					id="question-list"
					className="min-w-full divide-y divide-gray-200"
				>
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								Question
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								Answer
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200 bg-white">
						{editableQuestions.map((question, index) => (
							<tr key={question.id || index} className="question">
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
								<td className="whitespace-nowrap px-6 py-4">
									{isEditing && (
										<button
											type="button"
											onClick={() => handleDeleteClick(index)}
											className="rounded bg-red-500 px-2 py-1 text-white"
										>
											Delete
										</button>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
				<div className="my-4">
					{isEditing ? (
						<>
							<button
								type="submit"
								// type="button"
								// onClick={handleSaveClick}
								className="rounded bg-green-500 px-4 py-2 text-white"
							>
								Save
							</button>
							<button
								type="button"
								onClick={handleAddClick}
								className="ml-2 rounded bg-blue-500 px-4 py-2 text-white"
							>
								Add
							</button>
							<button
								type="button"
								onClick={handleDeleteAllClick}
								className="ml-2 rounded bg-red-500 px-4 py-2 text-white"
							>
								Delete All
							</button>
							<button
								type="button"
								onClick={handleCancelClick}
								className="ml-2 rounded bg-gray-500 px-4 py-2 text-white"
							>
								Close edititing
							</button>
						</>
					) : (
						<>
							<button
								type="button"
								onClick={handleEditClick}
								className="rounded bg-blue-500 px-4 py-2 text-white"
							>
								Edit
							</button>
							<button
								type="button"
								onClick={() => navigate(`/quizzes/${quizId}/start`)} // Nieuw: 'Start' knop met navigate functie
								className="ml-2 rounded bg-green-500 px-4 py-2 text-white"
							>
								Start
							</button>
						</>
					)}
				</div>
			</Form>
			<div className="my-4">
				<Link to="/quizzes" className="text-blue-500 hover:underline">
					Terug naar quizzes
				</Link>
			</div>
		</div>
	)
}
