import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, Form, useNavigate } from '@remix-run/react'
import { useState } from 'react'
import {
	getQuestionsByQuizId,
	getQuizById,
	getQuizSettings,
} from '#app/data/quiz.server.js'
import { type QuestionOrder } from '#app/types/index.ts'
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

	const settings = await getQuizSettings(userId, quizId)
	const order = (settings?.order || 'random') as QuestionOrder

	// Sorteer de vragen op basis van de gekozen volgorde
	let sortedQuestions = [...questions]
	if (order === 'random') {
		sortedQuestions = sortedQuestions.sort(() => Math.random() - 0.5)
	} else if (order === 'bottom-to-top') {
		sortedQuestions = sortedQuestions.reverse()
	}

	return json({ quiz, sortedQuestions })
}

export default function QuizPlayRoute() {
	const { quiz, sortedQuestions } = useLoaderData<typeof loader>()
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
	const [userAnswer, setUserAnswer] = useState('')
	const [feedback, setFeedback] = useState<string | null>(null)
	const [hasMoreQuestions, setHasMoreQuestions] = useState(true)
	const navigate = useNavigate()

	// Controleer of currentQuestionIndex binnen het bereik van sortedQuestions ligt
	const currentQuestion =
		currentQuestionIndex < sortedQuestions.length
			? sortedQuestions[currentQuestionIndex]
			: null

	// Functie om vraag voor te lezen
	const handleReadQuestion = () => {
		if (currentQuestion && 'speechSynthesis' in window) {
			const utterance = new SpeechSynthesisUtterance(currentQuestion.question)
			window.speechSynthesis.speak(utterance)
		} else {
			alert('Uw browser ondersteunt geen spraakweergave.')
		}
	}

	const handleAnswerSubmit = (event: React.FormEvent) => {
		event.preventDefault()

		if (currentQuestion) {
			if (
				userAnswer.trim().toLowerCase() === currentQuestion.answer.toLowerCase()
			) {
				setFeedback('Correct!')
			} else {
				setFeedback(`Fout! Het juiste antwoord is: ${currentQuestion.answer}`)
			}

			if (currentQuestionIndex < sortedQuestions.length - 1) {
				setCurrentQuestionIndex(prevIndex => prevIndex + 1)
				setUserAnswer('')
			} else {
				setHasMoreQuestions(false)
			}
		}
	}

	return (
		<div className="container mx-auto px-4">
			<h1 className="my-4 text-2xl font-bold">Quiz: {quiz.title}</h1>

			{hasMoreQuestions ? (
				currentQuestion ? (
					<div>
						<h2 className="my-4 text-xl">{currentQuestion.question}</h2>
						<button
							onClick={handleReadQuestion}
							className="mb-4 flex items-center rounded bg-green-500 px-4 py-2 text-white"
						>
							{/* Unicode karakter voor luidspreker icoon */}
							<span className="mr-2">🔊</span> Lees de vraag voor
						</button>

						<Form onSubmit={handleAnswerSubmit}>
							<input
								type="text"
								value={userAnswer}
								onChange={e => setUserAnswer(e.target.value)}
								className="mb-4 w-full rounded border px-2 py-1"
								placeholder="Typ uw antwoord hier..."
							/>
							{/* <div className="container mx-auto px-4"> */}
							<button
								type="submit"
								className="rounded bg-blue-500 px-4 py-2 text-white"
							>
								Verstuur Antwoord
							</button>
							<button
								onClick={() => navigate(`/quizzes/${quiz.id}/start`)}
								//className="rounded bg-blue-500 px-4 py-2 text-white"
								className="ml-2 rounded bg-gray-500 px-4 py-2 text-white"
							>
								Terug naar instellingen
							</button>
							{/* </div> */}
						</Form>

						{feedback && <p className="mt-4">{feedback}</p>}
					</div>
				) : (
					<p>Geen vragen beschikbaar.</p>
				)
			) : (
				<div>
					<h2 className="my-4 text-xl">Quiz Voltooid!</h2>
					<button
						onClick={() => navigate(`/quizzes/${quiz.id}/start`)}
						className="rounded bg-gray-500 px-4 py-2 text-white"
					>
						Terug naar instellingen
					</button>
				</div>
			)}
		</div>
	)
}
