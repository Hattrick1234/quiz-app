import { json, type LoaderFunctionArgs } from '@remix-run/node'
import { useLoaderData, Form, useNavigate } from '@remix-run/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import DiacriticsInput from '#app/components/diacriticsInput.js'
import {
	getQuestionsByQuizId,
	getQuizById,
	getQuizSettings,
	updateQuestionById,
} from '#app/data/quiz.server.js'
import {
	AskingOrder,
	DifficultSetting,
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
	const difficultSetting = (settings?.difficultSetting ||
		DifficultSetting.Off) as DifficultSetting
	const showAnswerAtStart = (settings?.showAnswerAtStart || false) as boolean

	// Filter de vragen op basis van difficultSetting
	let filteredQuestions = [...questions]
	if (
		difficultSetting === DifficultSetting.Manual ||
		(difficultSetting === DifficultSetting.Automatic &&
			questions.some(question => question.difficult === true)) // Controleer of er minstens één moeilijke vraag is
	) {
		filteredQuestions = filteredQuestions.filter(
			question => question.difficult === true,
		)
	}

	// Sorteer de vragen op basis van de gekozen volgorde
	let sortedQuestions: QuizQuestion[] = filteredQuestions.map(questionLine => ({
		...questionLine,
		questionLanguage: quiz.questionLanguage, // Voeg standaard de vraag en antwoordtaal toe
		answerLanguage: quiz.answerLanguage,
	}))
	if (order === QuestionOrder.Random) {
		sortedQuestions = sortedQuestions.sort(() => Math.random() - 0.5)
	} else if (order === QuestionOrder.BottomToTop) {
		sortedQuestions = sortedQuestions.reverse()
	}

	// // Voeg taal toe op basis van askingOrder
	// sortedQuestions = sortedQuestions.map(questionLine => {
	// 	if (askingOrder === AskingOrder.AnswerToQuestion) {
	// 		return {
	// 			...questionLine,
	// 			question: questionLine.answer,
	// 			answer: questionLine.question,
	// 			questionLanguage: quiz.answerLanguage, // Inverteer de talen
	// 			answerLanguage: quiz.questionLanguage,
	// 		}
	// 	} else if (askingOrder === AskingOrder.Mix) {
	// 		const shouldSwap = Math.random() >= 0.5
	// 		if (shouldSwap) {
	// 			return {
	// 				...questionLine,
	// 				question: questionLine.answer,
	// 				answer: questionLine.question,
	// 				questionLanguage: quiz.answerLanguage, // Verwissel talen als de vragen worden omgedraaid
	// 				answerLanguage: quiz.questionLanguage,
	// 			}
	// 		}
	// 	}

	// 	return {
	// 		...questionLine,
	// 		questionLanguage: quiz.questionLanguage,
	// 		answerLanguage: quiz.answerLanguage,
	// 	}
	// })

	// Voeg taal toe op basis van askingOrder
	if (askingOrder === AskingOrder.AnswerToQuestion) {
		sortedQuestions = sortedQuestions.map(questionLine => ({
			...questionLine,
			question: questionLine.answer,
			answer: questionLine.question,
			questionLanguage: quiz.answerLanguage, // Inverteer de talen
			answerLanguage: quiz.questionLanguage,
		}))
	} else if (askingOrder === AskingOrder.Mix) {
		sortedQuestions = sortedQuestions.map(questionLine => {
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
			return questionLine
		})
	} else if (askingOrder === AskingOrder.AllBothDirections) {
		// Voeg zowel QuestionToAnswer als AnswerToQuestion toe
		const allQuestions: QuizQuestion[] = []

		sortedQuestions.forEach(questionLine => {
			allQuestions.push({
				...questionLine,
				questionLanguage: quiz.questionLanguage,
				answerLanguage: quiz.answerLanguage,
			})
			allQuestions.push({
				...questionLine,
				question: questionLine.answer,
				answer: questionLine.question,
				questionLanguage: quiz.answerLanguage,
				answerLanguage: quiz.questionLanguage,
			})
		})

		sortedQuestions = allQuestions
		if (order === QuestionOrder.Random) {
			sortedQuestions = sortedQuestions.sort(() => Math.random() - 0.5)
		}
	}

	return json({
		quiz,
		sortedQuestions,
		readOption,
		askingOrder,
		difficultSetting,
		showAnswerAtStart,
	})
}

export async function action({ request }: LoaderFunctionArgs) {
	const formData = await request.formData()
	const questionId = formData.get('questionId')
	const updatedDifficult = formData.get('difficult') === 'true'

	if (typeof questionId !== 'string') {
		return json({ error: 'Invalid question ID' }, { status: 400 })
	}

	try {
		await updateQuestionById(questionId, { difficult: updatedDifficult })
		return json({ success: true })
	} catch (error) {
		console.log(error)
		return json({ error: 'Failed to update question' }, { status: 500 })
	}
}

export default function QuizPlayRoute() {
	const {
		quiz,
		sortedQuestions,
		readOption,
		difficultSetting,
		showAnswerAtStart,
	} = useLoaderData<typeof loader>()
	const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
	const [feedback, setFeedback] = useState<string | null>(null)
	const [hasMoreQuestions, setHasMoreQuestions] = useState(true)
	const [numberOfAnsweredQuestions, setNumberOfAnsweredQuestions] = useState(0)
	const [numberOfCorrectAnswers, setNumberOfCorrectAnswers] = useState(0)
	const [revealedLetters, setRevealedLetters] = useState(0)
	const [userAnswer, setUserAnswer] = useState('')
	const navigate = useNavigate()
	// Ref voor het inputveld
	const inputRef = useRef<HTMLInputElement>(null)
	const numberOfQuestions = sortedQuestions.length

	// Controleer of currentQuestionIndex binnen het bereik van sortedQuestions ligt
	const currentQuestion =
		currentQuestionIndex < sortedQuestions.length
			? sortedQuestions[currentQuestionIndex]
			: null

	// Bereken percentage correcte antwoorden
	const scorePercentage =
		numberOfAnsweredQuestions > 0
			? Math.round((numberOfCorrectAnswers / numberOfAnsweredQuestions) * 100)
			: 0

	// Functie om vraag voor te lezen (kan niet aangeroepen worden in de useEffect, dan komt er een ES-lint foutmelding)
	const handleReadQuestion = () => {
		if (currentQuestion && 'speechSynthesis' in window) {
			const utterance = new SpeechSynthesisUtterance(currentQuestion.question)
			utterance.lang = currentQuestion.questionLanguage // .questionLanguage //Stel de taal in naar bijv. Frans fr, Engels en of Nederlands nl
			window.speechSynthesis.speak(utterance)
		} else {
			alert('Uw browser ondersteunt geen spraakweergave.')
		}
	}

	useEffect(() => {
		//Focus gelijk zetten in het invoerveld bij starten van het scherm
		inputRef.current?.focus()
	}, []) // Lege dependency-array zodat dit alleen bij de eerste render wordt uitgevoerd

	useEffect(() => {
		if (showAnswerAtStart) {
			const handleRevealWord = () => {
				if (currentQuestion) {
					setUserAnswer('')
					setRevealedLetters(currentQuestion.answer.length)
					inputRef.current?.focus()
				}
			}

			handleRevealWord()
		}
	}, [
		showAnswerAtStart,
		currentQuestion,
		setUserAnswer,
		setRevealedLetters,
		inputRef,
	]) // Alle afhankelijkheden

	// Effect om bij elke nieuwe vraag hinttekst en voorleesgedrag uit te voeren
	useEffect(() => {
		//Toon antwoord in hinttekst indien deze instelling is gezet
		// if (showAnswerAtStart) {
		// 	handleRevealWord()
		// }
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
			let isCorrect =
				userAnswer.trim().toLowerCase() === currentQuestion.answer.toLowerCase()
			if (isCorrect) {
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

			// Als de difficultSetting op 'automatic' staat, pas de moeilijkheidsgraad aan
			if (difficultSetting === 'automatic') {
				const formData = new FormData()
				formData.append('questionId', currentQuestion.id)
				formData.append('difficult', isCorrect ? 'false' : 'true')

				await fetch(`/quizzes/${quiz.id}/play`, {
					method: 'POST',
					body: formData,
				})
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
		//voegt de diakriet toe op de plaats van de cursor
		if (inputRef.current) {
			const input = inputRef.current
			const start = input.selectionStart || 0
			const end = input.selectionEnd || 0

			// Huidige waarde splitsen op basis van cursorpositie
			const updatedAnswer =
				userAnswer.slice(0, start) + char + userAnswer.slice(end)

			// Werk de antwoord state bij met het nieuwe antwoord
			setUserAnswer(updatedAnswer)

			// Zorg ervoor dat de cursor na het ingevoegde teken blijft staan
			// (caret position wordt één plaats na het ingevoegde karakter)
			setTimeout(() => {
				input.setSelectionRange(start + char.length, start + char.length)
			}, 0)

			// Breng focus terug naar het inputveld
			input.focus()
		}
	}

	const handleRevealLetter = () => {
		if (currentQuestion) {
			//leegmaken wat je had ingevuld zodat hij de letter toont in de placeholdertekst
			setUserAnswer('')
			setRevealedLetters(prev =>
				Math.min(prev + 1, currentQuestion.answer.length),
			)
			inputRef.current?.focus()
		}
	}

	const handleRevealWord = useCallback(() => {
		if (currentQuestion) {
			//leegmaken wat je had ingevuld zodat hij de letter toont in de placeholdertekst
			setUserAnswer('')
			setRevealedLetters(currentQuestion.answer.length)
			inputRef.current?.focus()
		}
	}, [currentQuestion])

	return (
		<div className="container mx-auto px-4">
			<h1 className="my-4 text-2xl font-bold">Quiz: {quiz.title}</h1>
			{/* Score weergave */}
			<div className="my-4">
				<p>
					Nog te gaan: {numberOfQuestions - numberOfAnsweredQuestions} vragen
					van totaal {numberOfQuestions} vragen.
				</p>
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
								className="mb-4 ml-2 flex items-center rounded bg-yellow-500 px-4 py-2 text-white"
							>
								Toon (extra) letter
							</button>
							<button
								type="button"
								onClick={handleRevealWord}
								className="mb-4 ml-2 flex items-center rounded bg-teal-600 px-4 py-2 text-white"
							>
								Toon hele woord
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
					<button
						onClick={() => {
							// Reset de relevante state handmatig voordat je opnieuw navigeert
							setCurrentQuestionIndex(0)
							setHasMoreQuestions(true)
							setNumberOfCorrectAnswers(0)
							setNumberOfAnsweredQuestions(0)
							setUserAnswer('')
							setFeedback('')

							// Forceer opnieuw laden van de huidige route
							navigate(`/quizzes/${quiz.id}/play`, { replace: true })
						}}
						// onClick={() => navigate(`/quizzes/${quiz.id}/play`)}
						className="ml-2 rounded bg-lime-500 px-4 py-2 text-white"
					>
						Nog een keer deze quiz
					</button>
				</div>
			)}
		</div>
	)
}
