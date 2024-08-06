import { type Quiz } from '@prisma/client'
import {
	json,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { Link, useLoaderData, useFetcher } from '@remix-run/react'
import { requireUserId } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	const quizzes = await prisma.quiz.findMany({
		select: {
			id: true,
			title: true,
			createdAt: true,
		},
		where: {
			ownerId: userId,
		},
	})

	return json(quizzes) // Retourneert de array van quizzes direct
}

// Action voor het aanmaken en verwijderen van quizzes
export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent')

	if (intent === 'create') {
		const title = formData.get('title') as string
		if (!title) {
			return json({ error: 'Title is required' }, { status: 400 })
		}

		const newQuiz = await prisma.quiz.create({
			data: {
				title,
				ownerId: userId,
			},
		})

		return json({ newQuiz })
	} else if (intent === 'delete') {
		const quizId = formData.get('quizId') as string

		if (!quizId) {
			return json({ error: 'Quiz ID is required' }, { status: 400 })
		}

		await prisma.quiz.delete({
			where: {
				id: quizId,
			},
		})

		return json({ success: true })
	}

	return json({ error: 'Invalid action' }, { status: 400 })
}

export default function UsersRoute() {
	const quizzes = useLoaderData<Quiz[]>() // Verwacht een array van Quiz-objecten
	const fetcher = useFetcher()

	return (
		<div className="grid place-items-center">
			<h1>Kies een overhoring of quiz uit:</h1>

			{/* Lijst van bestaande quizzes */}
			<ul id="quiz-list">
				{quizzes.map(quiz => (
					<li key={quiz.id} className="quiz flex items-center justify-between">
						<Link to={quiz.id} className="link">
							<h2>{quiz.title}</h2>
						</Link>
						<fetcher.Form method="post">
							<input type="hidden" name="quizId" value={quiz.id} />
							<button
								type="submit"
								name="intent"
								value="delete"
								className="ml-4 rounded bg-red-500 px-2 py-1 text-white"
							>
								Delete
							</button>
						</fetcher.Form>
					</li>
				))}
			</ul>

			{/* Formulier om een nieuwe quiz aan te maken */}
			<fetcher.Form method="post" className="mt-8">
				<label>
					Nieuwe quiz:
					<input
						type="text"
						name="title"
						placeholder="Titel van de quiz"
						className="ml-2 rounded border px-2 py-1"
					/>
				</label>
				<button
					type="submit"
					name="intent"
					value="create"
					className="ml-4 rounded bg-blue-500 px-4 py-2 text-white"
				>
					Create
				</button>
			</fetcher.Form>
		</div>
	)
}
