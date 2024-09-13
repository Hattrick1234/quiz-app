import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, Form, useNavigate } from '@remix-run/react'
import { useEffect, useState } from 'react'
import {
	getQuestionsByQuizId,
	getQuizById,
	getQuizSettings,
} from '#app/data/quiz.server.js'
import { QuestionOrder, QuestionReadOption } from '#app/types/index.ts'
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
	const order = (settings?.order || QuestionOrder.Random) as QuestionOrder
	const readOption = (settings?.readOption ||
		QuestionReadOption.None) as QuestionReadOption

	// Sorteer de vragen op basis van de gekozen volgorde
	let sortedQuestions = [...questions]
	if (order === QuestionOrder.Random) {
		sortedQuestions = sortedQuestions.sort(() => Math.random() - 0.5)
	} else if (order === QuestionOrder.BottomToTop) {
		sortedQuestions = sortedQuestions.reverse()
	}

	return json({ quiz, sortedQuestions, readOption })
}

export default function QuizPlayRoute() {
	const { quiz, sortedQuestions, readOption } = useLoaderData<typeof loader>()
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

	// Functie om vraag voor te lezen (kan niet aangeroepen worden in de useEffect, dan komt er een ES-lint foutmelding)
	const handleReadQuestion = () => {
		if (currentQuestion && 'speechSynthesis' in window) {
			const utterance = new SpeechSynthesisUtterance(currentQuestion.question)
			utterance.lang = quiz.questionLanguage //Stel de taal in naar bijv. Frans fr, Engels en of Nederlands nl
			window.speechSynthesis.speak(utterance)
		} else {
			alert('Uw browser ondersteunt geen spraakweergave.')
		}
	}

	// Effect om de vraag automatisch voor te lezen op basis van readOption
	useEffect(() => {
		// Controleer of huidige vraag beschikbaar is en spraakweergave wordt ondersteund
		if (currentQuestion && 'speechSynthesis' in window) {
			// Check de optie voor het voorlezen van de vraag
			if (
				readOption === QuestionReadOption.ReadWithQuestion ||
				readOption === QuestionReadOption.ReadWithoutQuestion
			) {
				// Maak en spreek de uitspraak
				const utterance = new SpeechSynthesisUtterance(currentQuestion.question)
				utterance.lang = quiz.questionLanguage // 'fr-FR' // Stel de taal in
				window.speechSynthesis.speak(utterance)
			}
		} else if (!('speechSynthesis' in window)) {
			alert('Uw browser ondersteunt geen spraakweergave.')
		}
	}, [currentQuestion, readOption, quiz.questionLanguage]) // Vereenvoudigde afhankelijkheden

	const handleAnswerSubmit = async (event: React.FormEvent) => {
		event.preventDefault()

		if (currentQuestion) {
			if (
				userAnswer.trim().toLowerCase() === currentQuestion.answer.toLowerCase()
			) {
				setFeedback('Correct!')
			} else {
				// setFeedback(`Fout! Het juiste antwoord is: ${currentQuestion.answer}`)

				let feedbackMessage =
					'Helaas, zie hieronder het door jou ingevulde woord en daaronder wat het had moeten zijn:\n'
				feedbackMessage += `${userAnswer.trim()}\n${currentQuestion.answer}\n\n`

				setFeedback(feedbackMessage)
			}

			// Wacht even voordat je de quiz als voltooid markeert
			if (currentQuestionIndex < sortedQuestions.length - 1) {
				setCurrentQuestionIndex(prevIndex => prevIndex + 1)
				setUserAnswer('')
			} else {
				// Gebruik een korte vertraging om feedback weer te geven
				setTimeout(() => {
					setFeedback(prevFeedback =>
						prevFeedback ? prevFeedback + '\nQuiz voltooid!' : 'Quiz voltooid!',
					)
					setHasMoreQuestions(false)
				}, 3500) // Vertraging van 3,5 seconden
			}
		}
	}

	return (
		<div className="container mx-auto px-4">
			<h1 className="my-4 text-2xl font-bold">Quiz: {quiz.title}</h1>

			{hasMoreQuestions ? (
				currentQuestion ? (
					<div>
						{/* <h2 className="my-4 text-xl">{currentQuestion.question}</h2> */}
						{/* Toon vraag afhankelijk van de voorleesoptie */}
						{readOption !== QuestionReadOption.ReadWithoutQuestion && (
							<h2 className="my-4 text-xl">{currentQuestion.question}</h2>
						)}
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

						{feedback && (
							<p className="mt-4 whitespace-pre-wrap text-base font-normal leading-relaxed text-gray-700">
								{feedback}
							</p>
						)}
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
