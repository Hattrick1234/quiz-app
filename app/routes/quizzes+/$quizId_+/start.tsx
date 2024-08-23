import { type LoaderFunctionArgs } from '@remix-run/node'
import {
	Form,
	useNavigate,
	useLoaderData,
	Link,
	useSearchParams,
} from '@remix-run/react' // Add Link
import { useState } from 'react'
import { getQuizById } from '#app/data/quiz.server.js'
import { type QuestionOrder } from '#app/types/index.ts' // Import the new type
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

	return { quiz }
}

export default function QuizStartRoute() {
	const { quiz } = useLoaderData<typeof loader>()
	const navigate = useNavigate()

	// Use the QuestionOrder type
	const [searchParams] = useSearchParams()
	const initialOrder = (searchParams.get('order') as QuestionOrder) || 'random'
	const [order, setOrder] = useState<QuestionOrder>(initialOrder)

	const handleStartQuiz = () => {
		navigate(`/quizzes/${quiz.id}/play?order=${order}`) // Navigating to the play mode of the quiz
	}

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
								checked={order === 'random'}
								onChange={() => setOrder('random')}
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
								checked={order === 'top-to-bottom'}
								onChange={() => setOrder('top-to-bottom')}
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
								checked={order === 'bottom-to-top'}
								onChange={() => setOrder('bottom-to-top')}
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
				<div className="my-4">
					<button
						type="button"
						onClick={handleStartQuiz} // Use the handle function to navigate
						className="rounded bg-blue-500 px-4 py-2 text-white"
					>
						Start Quiz
					</button>
				</div>
			</Form>
			{/* Terugknop toegevoegd */}
			<div className="my-4">
				<Link
					to={`/quizzes/${quiz.id}`}
					className="text-blue-500 hover:underline"
				>
					Terug naar bewerkmodus
				</Link>
			</div>
		</div>
	)
}
