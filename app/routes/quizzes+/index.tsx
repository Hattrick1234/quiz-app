import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
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

	invariantResponse(quizzes, 'Quizzes not found', { status: 404 })

	return quizzes
}

export default function UsersRoute() {
	const quizzes = useLoaderData<typeof loader>()

	return (
		<div className="grid h-16 place-items-center">
			<h1>Kies een overhoring of quiz uit:</h1>
			<ul id="quiz-list">
				{quizzes.map(quiz => (
					<li key={quiz.id} className="quiz">
						<Link to={quiz.id} className="link">
							<h2>{quiz.title}</h2>
						</Link>
					</li>
				))}
			</ul>
		</div>
	)
}
