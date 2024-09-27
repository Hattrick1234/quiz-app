import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, Form, useNavigate } from '@remix-run/react'
import { useEffect, useRef, useState } from 'react'
import DiacriticsInput from '#app/components/diacriticsInput.js'
import {
	getQuestionsByQuizId,
	getQuizById,
	getQuizSettings,
} from '#app/data/quiz.server.js'
import {
	AskingOrder,
	QuestionOrder,
	QuestionReadOption,
	type QuizQuestion,
} from '#app/types/index.ts'
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
	const askingOrder = (settings?.askingOrder ||
		AskingOrder.QuestionToAnswer) as AskingOrder

	// Sorteer de vragen op basis van de gekozen volgorde
	let sortedQuestions: QuizQuestion[] = [...questions].map(questionLine => ({
		...questionLine,
		questionLanguage: quiz.questionLanguage, // Voeg standaard de vraag en antwoordtaal toe
		answerLanguage: quiz.answerLanguage,
	}))
	if (order === QuestionOrder.Random) {
		sortedQuestions = sortedQuestions.sort(() => Math.random() - 0.5)
	} else if (order === QuestionOrder.BottomToTop) {
		sortedQuestions = sortedQuestions.reverse()
	}

	// Voeg taal toe op basis van askingOrder
	sortedQuestions = sortedQuestions.map(questionLine => {
		// let questionLanguage = quiz.questionLanguage
		// let answerLanguage = quiz.answerLanguage

		if (askingOrder === AskingOrder.AnswerToQuestion) {
			return {
				...questionLine,
				question: questionLine.answer,
				answer: questionLine.question,
				questionLanguage: quiz.answerLanguage, // Inverteer de talen
				answerLanguage: quiz.questionLanguage,
			}
		} else if (askingOrder === AskingOrder.Mix) {
			const shouldSwap = Math.random() >= 0.5
			if (shouldSwap) {
				return {
					...questionLine,
					question: questionLine.answer,
					answer: questionLine.question,
					questionLanguage: quiz.answerLanguage, // Verwissel talen als de vragen worden omgedraaid
					answerLanguage: quiz.questionLanguage,
				}
			}
		}

		return {
			...questionLine,
			questionLanguage: quiz.questionLanguage,
			answerLanguage: quiz.answerLanguage,
		}
	})

	return json({ quiz, sortedQuestions, readOption, askingOrder })
}

export default function QuizPlayRoute() {
	const { quiz, sortedQuestions, readOption } = useLoaderData<typeof loader>()
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
	const [userAnswer, setUserAnswer] = useState('')
	const [feedback, setFeedback] = useState<string | null>(null)
	const [revealedLetters, setRevealedLetters] = useState(0)
	const [hasMoreQuestions, setHasMoreQuestions] = useState(true)
	// Nieuwe staten voor score
	const [numberOfCorrectAnswers, setNumberOfCorrectAnswers] = useState(0)
	const [numberOfAnsweredQuestions, setNumberOfAnsweredQuestions] = useState(0)
	const navigate = useNavigate()

	// Ref voor het inputveld
	const inputRef = useRef<HTMLInputElement>(null)

	// Controleer of currentQuestionIndex binnen het bereik van sortedQuestions ligt
	const currentQuestion =
		currentQuestionIndex < sortedQuestions.length
			? sortedQuestions[currentQuestionIndex]
			: null

	// console.log(currentQuestion)

	// Bereken percentage correcte antwoorden
	const scorePercentage =
		numberOfAnsweredQuestions > 0
			? Math.round((numberOfCorrectAnswers / numberOfAnsweredQuestions) * 100)
			: 0

	// Functie om vraag voor te lezen (kan niet aangeroepen worden in de useEffect, dan komt er een ES-lint foutmelding)
	const handleReadQuestion = () => {
		if (currentQuestion && 'speechSynthesis' in window) {
			const utterance = new SpeechSynthesisUtterance(currentQuestion.question)
			//utterance.lang = quiz.questionLanguage //Stel de taal in naar bijv. Frans fr, Engels en of Nederlands nl
			utterance.lang = currentQuestion.questionLanguage // .questionLanguage //Stel de taal in naar bijv. Frans fr, Engels en of Nederlands nl
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
				utterance.lang = currentQuestion.questionLanguage
				window.speechSynthesis.speak(utterance)
			}
		} else if (!('speechSynthesis' in window)) {
			alert('Uw browser ondersteunt geen spraakweergave.')
		}
	}, [currentQuestion, readOption, quiz.questionLanguage]) // Vereenvoudigde afhankelijkheden

	const handleAnswerSubmit = async (event: React.FormEvent) => {
		event.preventDefault()

		//Zet het aantal onthulde letters weer op 0 voor de nieuwe vraag
		setRevealedLetters(0)
		// Focus terug naar het invoerveld, voor het geval je de knop had ingedrukt om antwoord te verzenden
		inputRef.current?.focus()

		// Controleer of het antwoord leeg is
		if (userAnswer.trim() === '') {
			setFeedback('Vul een antwoord in voordat je verder gaat.')
			return
		}

		if (currentQuestion) {
			setNumberOfAnsweredQuestions(prev => prev + 1) // Verhoog het aantal beantwoorde vragen
			if (
				userAnswer.trim().toLowerCase() === currentQuestion.answer.toLowerCase()
			) {
				setFeedback('Correct!')
				setNumberOfCorrectAnswers(prev => prev + 1) // Verhoog het aantal correcte antwoorden
			} else {
				// Set de vraag als onderdeel van de feedback
				let feedbackMessage = 'Helaas:\n'

				// Voeg de vraag toe
				feedbackMessage += `De vraag was: ${currentQuestion.question}\n`
				feedbackMessage += `${userAnswer.trim()} (jouw antwoord)\n${currentQuestion.answer} (goede antwoord)\n\n`

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
				}, 1500) // Vertraging in milliseconden voor afsluiten van quiz
			}
		}
	}

	const handleInsertDiacritic = (char: string) => {
		setUserAnswer(prevAnswer => prevAnswer + char)
		inputRef.current?.focus() // Breng focus terug naar het inputveld
	}

	const handleRevealLetter = () => {
		if (currentQuestion) {
			setRevealedLetters(prev =>
				Math.min(prev + 1, currentQuestion.answer.length),
			)
		}
	}

	return (
		<div className="container mx-auto px-4">
			<h1 className="my-4 text-2xl font-bold">Quiz: {quiz.title}</h1>
			{/* Score weergave */}
			<div className="my-4">
				<p>
					Score: {scorePercentage}% ({numberOfCorrectAnswers}/
					{numberOfAnsweredQuestions})
				</p>
			</div>

			{hasMoreQuestions ? (
				currentQuestion ? (
					<div>
						{/* Toon vraag afhankelijk van de voorleesoptie */}
						{readOption !== QuestionReadOption.ReadWithoutQuestion && (
							<h2 className="my-4 text-xl">{currentQuestion.question}</h2>
						)}
						<div className="mb-4 flex">
							<button
								onClick={handleReadQuestion}
								className="mb-4 flex items-center rounded bg-green-500 px-4 py-2 text-white"
							>
								{/* Unicode karakter voor luidspreker icoon */}
								<span className="mr-2">🔊</span> Lees de vraag voor
							</button>
							<button
								type="button"
								onClick={handleRevealLetter}
								//className="ml-2 rounded bg-yellow-500 px-4 py-2 text-white"
								className="mb-4 ml-2 flex items-center rounded bg-yellow-500 px-4 py-2 text-white"
							>
								Toon een letter (indien niks is ingevuld)
							</button>
						</div>

						<Form onSubmit={handleAnswerSubmit}>
							<DiacriticsInput onInsert={handleInsertDiacritic} />

							<input
								ref={inputRef}
								type="text"
								value={userAnswer}
								onChange={e => setUserAnswer(e.target.value)}
								className="mb-4 w-full rounded border px-2 py-1"
								placeholder={
									currentQuestion
										? currentQuestion.answer.slice(0, revealedLetters)
										: 'Typ uw antwoord hier...'
								} // Toon de onthulde letters, elke keer als je op de toon letter knop drukt een extra letter
							/>
							<button
								type="submit"
								className="rounded bg-blue-500 px-4 py-2 text-white"
							>
								Verstuur Antwoord
							</button>
							<button
								onClick={() => navigate(`/quizzes/${quiz.id}/start`)}
								className="ml-2 rounded bg-gray-500 px-4 py-2 text-white"
							>
								Terug naar instellingen
							</button>
							<button
								onClick={() => navigate(`/quizzes`)}
								className="ml-2 rounded bg-purple-400 px-4 py-2 text-white"
							>
								Terug naar quizzes
							</button>
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
