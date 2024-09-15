import { type LoaderFunctionArgs } from '@remix-run/node'
import { Form, useLoaderData, Link, redirect } from '@remix-run/react' // Add Link
import { useState } from 'react'
import {
	getQuizById,
	getQuizSettings,
	saveQuizSettings,
} from '#app/data/quiz.server.js'
import { QuestionOrder, QuestionReadOption } from '#app/types/index.ts' // Import the new type
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
		QuestionReadOption.None) as QuestionReadOption

	console.log(readOption)
	return { quiz, userId, order, readOption }
}

// Voeg de action toe voor het opslaan van instellingen
export async function action({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const quizId = params.quizId

	const formData = await request.formData()
	const order = formData.get('order') as QuestionOrder // Verkrijg de volgorde van de form
	const readOption = formData.get('readOption') as QuestionReadOption // Verkrijg de voorleesoptie van de form

	if (!quizId) {
		throw new Response('Quiz ID is required', { status: 400 })
	}

	// Sla de quizinstellingen op
	await saveQuizSettings(userId, quizId, order, readOption)

	return redirect(`/quizzes/${quizId}/play`) // Verwijs naar de play-pagina
}

export default function QuizStartRoute() {
	const { quiz, order, readOption } = useLoaderData<typeof loader>()
	const [selectedOrder, setSelectedOrder] = useState<QuestionOrder>(order) // Gebruik de opgehaalde volgorde
	const [selectedReadOption, setSelectedReadOption] =
		useState<QuestionReadOption>(readOption)

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

				{/* Nieuwe sectie voor voorleesopties */}
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
