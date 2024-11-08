//idee was om de upload quiz uit de action van het formulier te halen, maar dat lukt niet, mogelijk later nog een keer proberen, op dit moment wordt deze code nog niet gebruikt
// app/routes/api+/upload-quiz.ts
import { type ActionFunctionArgs, json } from '@remix-run/node'
import Papa from 'papaparse'
import { createQuizWithQuestions } from '#app/data/quiz.server.ts'
import { type CSVQuestion } from '#app/types/index.js'
import { requireUserId } from '#app/utils/auth.server.ts'

// export const action: ActionFunction = async ({ request }) => {
export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData()
	const file = formData.get('csvFile') as File | null
	const userId = await requireUserId(request)
	const defaultLanguage = 'nl' // Definieer je default language

	if (!file) {
		return json({ error: 'CSV file is required' }, { status: 400 })
	}

	const content = await file.text()
	if (!content.trim()) {
		console.log('CSV file is leeg')
		return json({ error: 'CSV file is empty' }, { status: 400 })
	}

	const title = file.name.replace('.csv', '')
	let questions: CSVQuestion[]

	try {
		// Gebruik PapaParse om CSV-string naar JSON te converteren en typ de output correct
		const parsedResult = Papa.parse(content, {
			header: true,
			delimiter: ';',
			dynamicTyping: true,
			skipEmptyLines: true,
			// Zorgt dat header wordt gelezen zonder quotes
			transformHeader: header => header.trim(),
		})

		// Identificeer de headernamen van de eerste regel
		const [firstRow] = parsedResult.data
		const headers = Object.keys(firstRow || {})

		if (headers.length < 2) {
			return json(
				{
					error:
						'CSV must contain at least two columns for questions and answers.',
				},
				{ status: 400 },
			)
		}

		// Verwacht de eerste twee kolommen als de vraag- en antwoordvelden
		const [questionKey, answerKey] = headers

		// Map de headers naar de standaard `question` en `answer` met `orderIndex`
		// Controleer of questionKey en answerKey strings zijn voordat ze worden gebruikt
		if (typeof questionKey === 'string' && typeof answerKey === 'string') {
			questions = parsedResult.data.map((row: any, index: number) => ({
				orderIndex: index,
				question: row[questionKey] ?? '',
				answer: row[answerKey] ?? '',
			}))
		} else {
			return json(
				{ error: 'Failed to parse CSV: Invalid headers.' },
				{ status: 400 },
			)
		}

		questions = questions.filter(q => q.question?.trim() && q.answer?.trim())

		console.log(`questions array ziet er zo uit:`)
		console.log(questions)

		if (questions.length === 0) {
			console.log('Geen geldige vragen gevonden in de CSV file')
			return json(
				{ error: 'No valid questions found in CSV file' },
				{ status: 400 },
			)
		}

		//Converteer de questions en kijk of geldig question en answer formaten betreft
		questions = questions.map((q, index) => ({
			orderIndex: index,
			question: q.question,
			answer: q.answer,
		}))
	} catch (error) {
		return json(
			{ error: 'Failed to parse CSV', details: (error as Error).message },
			{ status: 500 },
		)
	}

	const newQuiz = await createQuizWithQuestions(
		title,
		userId,
		defaultLanguage,
		defaultLanguage,
		questions,
	)
	return json({ newQuiz })
}
