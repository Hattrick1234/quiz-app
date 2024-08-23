import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, Link } from '@remix-run/react'
import { type FormEvent, useState } from 'react'
import { getQuizById, getQuestionsByQuizId } from '#app/data/quiz.server.ts'
import { requireUserId } from '#app/utils/auth.server.js'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const quizId = params.quizId

	if (!quizId) {
		throw new Response('Quiz ID is required', { status: 400 })
	}

	const quiz = await getQuizById(userId, quizId)
	if (!quiz) {
		throw new Response('Quiz not found', { status: 404 })
	}

	const questions = await getQuestionsByQuizId(quizId)
	if (!questions) {
		throw new Response('Questions not found', { status: 404 })
	}

	return json({ quiz, questions })
}

export default function QuizPlayRoute() {
	const { quiz, questions } = useLoaderData<typeof loader>()
	const [currentIndex, setCurrentIndex] = useState(0)
	const [userAnswer, setUserAnswer] = useState('')
	const [feedback, setFeedback] = useState<string | null>(null)

	const currentQuestion = questions[currentIndex]
	const totalQuestions = questions.length

	const handleAnswerSubmit = (e: FormEvent) => {
		e.preventDefault()
		if (!currentQuestion) {
			return
		}

		if (
			userAnswer.trim().toLowerCase() ===
			currentQuestion.answer.trim().toLowerCase()
		) {
			setFeedback('Correct!')
		} else {
			setFeedback(`Incorrect! The correct answer is: ${currentQuestion.answer}`)
		}

		// Move to the next question after 2 seconds
		setTimeout(() => {
			setFeedback(null)
			setUserAnswer('')
			if (currentIndex < totalQuestions - 1) {
				setCurrentIndex(currentIndex + 1)
			} else {
				setFeedback('Quiz completed!')
			}
		}, 2000)
	}

	return (
		<div className="container mx-auto px-4">
			<h1 className="my-4 text-2xl font-bold">Quiz: {quiz.title}</h1>
			{currentQuestion && (
				<div className="my-4">
					<p className="text-lg font-medium">{currentQuestion.question}</p>
					<form onSubmit={handleAnswerSubmit}>
						<input
							type="text"
							value={userAnswer}
							onChange={e => setUserAnswer(e.target.value)}
							className="mt-2 rounded border border-gray-300 p-2"
							placeholder="Type your answer here"
						/>
						<button
							type="submit"
							className="mt-2 rounded bg-blue-500 px-4 py-2 text-white"
						>
							Submit
						</button>
					</form>
					{feedback && <p className="mt-2 text-lg">{feedback}</p>}
				</div>
			)}
			{/* Terugknop toegevoegd */}
			<div className="my-4">
				<Link
					to={`/quizzes/${quiz.id}/start`}
					className="text-blue-500 hover:underline"
				>
					Terug naar instellingen
				</Link>
			</div>
		</div>
	)
}
