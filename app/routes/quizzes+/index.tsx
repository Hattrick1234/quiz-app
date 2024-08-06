import { type Quiz } from '@prisma/client'
import {
	json,
	redirect,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { Link, useLoaderData, useFetcher } from '@remix-run/react'
import { useState } from 'react'
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
	}
	const quizId = formData.get('quizId') as string
	if (!quizId) {
		return json({ error: 'Quiz ID is required' }, { status: 400 })
	}

	if (intent === 'delete') {
		// const quizId = formData.get('quizId') as string

		// if (!quizId) {
		// 	return json({ error: 'Quiz ID is required' }, { status: 400 })
		// }

		await prisma.quiz.delete({
			where: {
				id: quizId,
			},
		})

		return json({ success: true })
	}

	if (intent === 'update') {
		const newTitle = formData.get('newTitle')
		if (typeof newTitle !== 'string' || !newTitle.trim()) {
			return json({ error: 'Invalid title' }, { status: 400 })
		}
		await prisma.quiz.updateMany({
			where: {
				id: quizId,
				ownerId: userId,
			},
			data: {
				title: newTitle,
			},
		})
		return redirect('/quizzes') // Redirect to refresh the page
	}

	return json({ error: 'Invalid action' }, { status: 400 })
}

export default function UsersRoute() {
	const quizzes = useLoaderData<Quiz[]>()
	const fetcher = useFetcher()
	const [editingQuizId, setEditingQuizId] = useState<string | null>(null)
	const [newTitle, setNewTitle] = useState<string>('')

	const handleEditClick = (quizId: string, currentTitle: string) => {
		setEditingQuizId(quizId)
		setNewTitle(currentTitle)
	}

	const handleCancelEdit = () => {
		setEditingQuizId(null)
		setNewTitle('')
	}

	return (
		<div className="grid place-items-center">
			<h1>Kies een overhoring of quiz uit:</h1>

			<ul id="quiz-list">
				{quizzes.map(quiz => (
					<li key={quiz.id} className="quiz flex items-center justify-between">
						{editingQuizId === quiz.id ? (
							<fetcher.Form method="post" className="flex items-center">
								<input type="hidden" name="quizId" value={quiz.id} />
								<input
									type="text"
									name="newTitle"
									value={newTitle}
									onChange={e => setNewTitle(e.target.value)}
									className="rounded border px-2 py-1"
								/>
								<button
									type="submit"
									name="intent"
									value="update"
									className="ml-2 rounded bg-green-500 px-4 py-2 text-white"
								>
									Save
								</button>
								<button
									type="button"
									onClick={handleCancelEdit}
									className="ml-2 rounded bg-gray-500 px-4 py-2 text-white"
								>
									Cancel
								</button>
							</fetcher.Form>
						) : (
							<>
								<Link to={quiz.id} className="link">
									<h2>{quiz.title}</h2>
								</Link>
								<div className="flex items-center">
									<button
										type="button"
										onClick={() => handleEditClick(quiz.id, quiz.title)}
										className="ml-4 rounded bg-yellow-500 px-2 py-1 text-white"
									>
										Edit
									</button>
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
								</div>
							</>
						)}
					</li>
				))}
			</ul>

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
