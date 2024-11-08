import { Parser as Json2CsvParser } from '@json2csv/plainjs'
import { type LoaderFunctionArgs, json } from '@remix-run/node'
import { prisma } from '#app/utils/db.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const url = new URL(request.url)
	const quizId = url.searchParams.get('quizId')

	if (!quizId) {
		return json({ error: 'Quiz ID is required' }, { status: 400 })
	}

	const quiz = await prisma.quiz.findUnique({
		where: { id: quizId },
		include: { questions: true },
	})

	if (!quiz) {
		return json({ error: 'Quiz not found' }, { status: 404 })
	}

	// Gebruik questionLanguage en answerLanguage als dynamische headers
	const questionHeader = quiz.questionLanguage || 'question'
	const answerHeader = quiz.answerLanguage || 'answer'

	// const fields = ['question', 'answer']
	// Stel de velden dynamisch in op basis van de taal van de quiz
	const fields = [
		{ label: questionHeader, value: 'question' },
		{ label: answerHeader, value: 'answer' },
	]
	const opts = { fields, delimiter: ';' }

	try {
		const json2csvParser = new Json2CsvParser(opts)
		const csv = json2csvParser.parse(quiz.questions)

		return new Response(csv, {
			status: 200,
			headers: {
				'Content-Type': 'text/csv',
				'Content-Disposition': `attachment; filename="${quiz.title}.csv"`,
			},
		})
	} catch (err) {
		console.error('Er is een fout opgetreden bij maken van de csv:', err)
		return json({ error: 'Failed to generate CSV' }, { status: 500 })
	}
}
