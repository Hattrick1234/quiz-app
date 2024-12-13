import { type LoaderFunctionArgs } from '@remix-run/node'
import { Form, useLoaderData, Link, redirect } from '@remix-run/react' // Add Link
import { useState } from 'react'
import {
	getQuizById,
	getQuizSettings,
	saveQuizSettings,
} from '#app/data/quiz.server.js'
import {
	AskingOrder,
	DifficultSetting,
	QuestionOrder,
	QuestionReadOption,
} from '#app/types/index.ts' // Import the new type
import { requireUserId } from '#app/utils/auth.server.js'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const quizId = params.quizId

	// Controleer of quizId bestaat en een string is
	if (!quizId) {
		throw new Response('Quiz ID is required', { status: 400 })
	}

	const quiz = await getQuizById(userId, quizId)

	if (!quiz) {
		throw new Response('Quiz not found', { status: 404 })
	}

	// Haal de opgeslagen instellingen op
	const settings = await getQuizSettings(userId, quizId)
	const order = (settings?.order ?? QuestionOrder.Random) as QuestionOrder
	const readOption = (settings?.readOption ??
		QuestionReadOption.ReadWithQuestion) as QuestionReadOption
	const askingOrder = (settings?.askingOrder ??
		AskingOrder.QuestionToAnswer) as AskingOrder
	const difficultSetting = (settings?.difficultSetting ??
		DifficultSetting.Automatic) as DifficultSetting
	const showAnswerAtStart = (settings?.showAnswerAtStart ?? false) as boolean

	console.log(readOption)
	return {
		quiz,
		userId,
		order,
		readOption,
		askingOrder,
		difficultSetting,
		showAnswerAtStart,
	}
}

// Voeg de action toe voor het opslaan van instellingen
export async function action({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const quizId = params.quizId

	const formData = await request.formData()
	const order = formData.get('order') as QuestionOrder // Verkrijg de volgorde van de form
	const readOption = formData.get('readOption') as QuestionReadOption // Verkrijg de voorleesoptie van de form
	const askingOrder = formData.get('askingOrder') as AskingOrder // Verkrijg de NL->EN, EN->NL of mix optie van de form
	const difficultSetting = formData.get('difficultOption') as DifficultSetting // Off, manual, automatic
	const showAnswerAtStart = formData.get('showAnswerAtStart') === 'on'

	if (!quizId) {
		throw new Response('Quiz ID is required', { status: 400 })
	}

	// Sla de quizinstellingen op
	await saveQuizSettings(
		userId,
		quizId,
		order,
		readOption,
		askingOrder,
		difficultSetting,
		showAnswerAtStart,
	)

	return redirect(`/quizzes/${quizId}/play`) // Verwijs naar de play-pagina
}

export default function QuizStartRoute() {
	const {
		quiz,
		order,
		readOption,
		askingOrder,
		difficultSetting,
		showAnswerAtStart,
	} = useLoaderData<typeof loader>()
	const [selectedOrder, setSelectedOrder] = useState<QuestionOrder>(order) // Gebruik de opgehaalde volgorde
	const [selectedReadOption, setSelectedReadOption] =
		useState<QuestionReadOption>(readOption)
	const [selectedQuestionAnswerOrder, setSelectedQuestionAnswerOrder] =
		useState<AskingOrder>(askingOrder)
	const [selectedDifficultOption, setSelectedDifficultOption] =
		useState<DifficultSetting>(difficultSetting)
	const [selectedShowAnswerAtStart, setSelectedShowAnswerAtStart] =
		useState(showAnswerAtStart)

	return (
		<div className="container mx-auto px-4">
			<h1 className="my-4 text-2xl font-bold">Instellingen voor de quiz</h1>
			<Form method="post">
				<div className="my-4">
					<label className="block text-sm font-medium text-gray-700">
						In welke volgorde wil je de vragen tonen?
					</label>
					<div className="mt-2">
						<div className="flex items-center">
							<input
								id="random"
								name="order"
								type="radio"
								value="random"
								checked={selectedOrder === QuestionOrder.Random}
								onChange={() => setSelectedOrder(QuestionOrder.Random)}
								className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
							/>
							<label
								htmlFor="random"
								className="ml-3 block text-sm text-gray-700"
							>
								Willekeurige volgorde
							</label>
						</div>
						<div className="flex items-center">
							<input
								id="top-to-bottom"
								name="order"
								type="radio"
								value="top-to-bottom"
								checked={selectedOrder === QuestionOrder.TopToBottom}
								onChange={() => setSelectedOrder(QuestionOrder.TopToBottom)}
								className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
							/>
							<label
								htmlFor="top-to-bottom"
								className="ml-3 block text-sm text-gray-700"
							>
								Van boven naar beneden
							</label>
						</div>
						<div className="flex items-center">
							<input
								id="bottom-to-top"
								name="order"
								type="radio"
								value="bottom-to-top"
								checked={selectedOrder === QuestionOrder.BottomToTop}
								onChange={() => setSelectedOrder(QuestionOrder.BottomToTop)}
								className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
							/>
							<label
								htmlFor="bottom-to-top"
								className="ml-3 block text-sm text-gray-700"
							>
								Van beneden naar boven
							</label>
						</div>
					</div>
				</div>

				{/* Sectie voor vraag naar antwoord, andersom of mix */}
				<div className="my-4">
					<label className="block text-sm font-medium text-gray-700">
						Wil je van vraag naar antwoord, andersom of een mix?
					</label>
					<div className="mt-2">
						<div className="flex items-center">
							<input
								id={AskingOrder.QuestionToAnswer}
								name="askingOrder"
								type="radio"
								value={AskingOrder.QuestionToAnswer}
								checked={
									selectedQuestionAnswerOrder === AskingOrder.QuestionToAnswer
								}
								onChange={() =>
									setSelectedQuestionAnswerOrder(AskingOrder.QuestionToAnswer)
								}
								className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
							/>
							<label
								htmlFor={AskingOrder.QuestionToAnswer}
								className="ml-3 block text-sm text-gray-700"
							>
								Vraag naar antwoord. ---Bijv. Nederlands naar Engels.---
							</label>
						</div>
						<div className="flex items-center">
							<input
								id={AskingOrder.AnswerToQuestion}
								name="askingOrder"
								type="radio"
								value={AskingOrder.AnswerToQuestion}
								checked={
									selectedQuestionAnswerOrder === AskingOrder.AnswerToQuestion
								}
								onChange={() =>
									setSelectedQuestionAnswerOrder(AskingOrder.AnswerToQuestion)
								}
								className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
							/>
							<label
								htmlFor={AskingOrder.AnswerToQuestion}
								className="ml-3 block text-sm text-gray-700"
							>
								Antwoord naar vraag. ---Bijv. omgekeerd dus Engels naar
								Nederlands.---
							</label>
						</div>
						<div className="flex items-center">
							<input
								id={AskingOrder.Mix}
								name="askingOrder"
								type="radio"
								value={AskingOrder.Mix}
								checked={selectedQuestionAnswerOrder === AskingOrder.Mix}
								onChange={() => setSelectedQuestionAnswerOrder(AskingOrder.Mix)}
								className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
							/>
							<label
								htmlFor={AskingOrder.Mix}
								className="ml-3 block text-sm text-gray-700"
							>
								Mix. --- Bijv. enkele vragen in Engels en enkele in
								Nederlands.---
							</label>
						</div>
						<div className="flex items-center">
							<input
								id={AskingOrder.AllBothDirections}
								name="askingOrder"
								type="radio"
								value={AskingOrder.AllBothDirections}
								checked={
									selectedQuestionAnswerOrder === AskingOrder.AllBothDirections
								}
								onChange={() =>
									setSelectedQuestionAnswerOrder(AskingOrder.AllBothDirections)
								}
								className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
							/>
							<label
								htmlFor={AskingOrder.AllBothDirections}
								className="ml-3 block text-sm text-gray-700"
							>
								Alles 2 kanten op --- bijv. Nederlands naar Engels en
								andersom.---
							</label>
						</div>
					</div>
				</div>

				{/* Sectie voor voorleesopties */}
				<div className="my-4">
					<label className="block text-sm font-medium text-gray-700">
						Voorleesopties
					</label>
					<div className="mt-2">
						<div className="flex items-center">
							<input
								id="none"
								name="readOption"
								type="radio"
								value="none"
								checked={selectedReadOption === QuestionReadOption.None}
								onChange={() => setSelectedReadOption(QuestionReadOption.None)}
								className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
							/>
							<label
								htmlFor="none"
								className="ml-3 block text-sm text-gray-700"
							>
								Niet voorlezen
							</label>
						</div>
						<div className="flex items-center">
							<input
								id="read-with-question"
								name="readOption"
								type="radio"
								value="read-with-question"
								checked={
									selectedReadOption === QuestionReadOption.ReadWithQuestion
								}
								onChange={() =>
									setSelectedReadOption(QuestionReadOption.ReadWithQuestion)
								}
								className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
							/>
							<label
								htmlFor="read-with-question"
								className="ml-3 block text-sm text-gray-700"
							>
								Voorlezen en vraag tonen
							</label>
						</div>
						<div className="flex items-center">
							<input
								id="read-without-question"
								name="readOption"
								type="radio"
								value="read-without-question"
								checked={
									selectedReadOption === QuestionReadOption.ReadWithoutQuestion
								}
								onChange={() =>
									setSelectedReadOption(QuestionReadOption.ReadWithoutQuestion)
								}
								className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
							/>
							<label
								htmlFor="read-without-question"
								className="ml-3 block text-sm text-gray-700"
							>
								Voorlezen zonder vraag tonen (dictee)
							</label>
						</div>
					</div>
				</div>

				{/* Sectie voor gebruik van moeilijke woorden */}
				<div className="my-4">
					<label className="block text-sm font-medium text-gray-700">
						Opties voor moeilijke woorden
					</label>
					<div className="mt-2">
						<div className="flex items-center">
							<input
								id="off"
								name="difficultOption"
								type="radio"
								value="off"
								checked={selectedDifficultOption === DifficultSetting.Off}
								onChange={() =>
									setSelectedDifficultOption(DifficultSetting.Off)
								}
								className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
							/>
							<label htmlFor="off" className="ml-3 block text-sm text-gray-700">
								Niet gebruiken
							</label>
						</div>
						<div className="flex items-center">
							<input
								id="manual"
								name="difficultOption"
								type="radio"
								value="manual"
								checked={selectedDifficultOption === DifficultSetting.Manual}
								onChange={() =>
									setSelectedDifficultOption(DifficultSetting.Manual)
								}
								className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
							/>
							<label
								htmlFor="manual"
								className="ml-3 block text-sm text-gray-700"
							>
								Handmatig beheren via vinkjes bij de vragen
							</label>
						</div>
						<div className="flex items-center">
							<input
								id="automatic"
								name="difficultOption"
								type="radio"
								value="automatic"
								checked={selectedDifficultOption === DifficultSetting.Automatic}
								onChange={() =>
									setSelectedDifficultOption(DifficultSetting.Automatic)
								}
								className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
							/>
							<label
								htmlFor="automatic"
								className="ml-3 block text-sm text-gray-700"
							>
								Automatisch vinkjes bij de vragen zetten op grond van foute
								antwoorden van de laatste quiz
							</label>
						</div>
					</div>
				</div>

				{/* Sectie voor gelijk hele woord tonen */}
				<div className="my-4">
					<label className="block text-sm font-medium text-gray-700">
						Oefenmodus door hele woord aan begin te tonen
					</label>

					<div className="flex items-center">
						<input
							id="showAnswerAtStart"
							name="showAnswerAtStart"
							type="checkbox"
							checked={selectedShowAnswerAtStart}
							onChange={() =>
								setSelectedShowAnswerAtStart(!selectedShowAnswerAtStart)
							}
							className="h-4 w-4 border-gray-300 text-indigo-600 focus:ring-indigo-500"
						/>
						<label
							htmlFor="showAnswerAtStart"
							className="ml-3 block text-sm text-gray-700"
						>
							Het antwoord aan het begin als hint tonen?
						</label>
					</div>
				</div>

				<div className="my-4">
					<button
						type="submit"
						className="rounded bg-blue-500 px-4 py-2 text-white"
					>
						Start Quiz
					</button>
				</div>
			</Form>
			{/* Terugknop toegevoegd */}
			<div className="my-4 flex space-x-4">
				<Link
					to={`/quizzes/${quiz.id}`}
					className="text-blue-500 hover:underline"
				>
					Terug naar bewerkmodus
				</Link>
				<Link to="/quizzes" className="text-blue-500 hover:underline">
					Terug naar quizzes
				</Link>
			</div>
		</div>
	)
}
