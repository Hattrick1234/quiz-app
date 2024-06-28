import { invariantResponse } from '@epic-web/invariant'
import { type LoaderFunctionArgs } from '@remix-run/node'
import { Link, useLoaderData } from '@remix-run/react'
import { requireUserId } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server.ts'

export async function loader({ request, params }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)
	const quizId = params.quizId

	// Controleer of de opgegeven quizId bij de opgegeven userId hoort
	const quiz = await prisma.quiz.findFirst({
		where: {
			id: quizId,
			ownerId: userId,
		},
	})

	invariantResponse(quiz, 'Quiz not found for the specified user', {
		status: 404,
	})

	const questions = await prisma.question.findMany({
		select: {
			id: true,
			question: true,
			answer: true,
			// createdAt: true,
		},
		where: {
			quizId: quizId,
		},
	})

	invariantResponse(questions, 'Questions not found', { status: 404 })

	return questions
}

export default function UsersRoute() {
	const questions = useLoaderData<typeof loader>()

	return (
		<div className="grid h-16 place-items-center">
			<h1>De vragen en antwoorden:</h1>
			<ul id="question-list">
				{questions.map(question => (
					<li key={question.id} className="question">
						{/* <Link to={quiz.id}> */}
						<h2>
							{question.question} = {question.answer}
						</h2>
						{/* </Link> */}
					</li>
				))}
			</ul>
			{/* <Link to="/quizzes" className="link">
				Terug naar quizzes
			</Link> */}
			<Link to="/quizzes" className="linkGekleurd">
				Terug naar quizzes
			</Link>
		</div>
	)
}
