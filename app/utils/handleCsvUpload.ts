import { json } from '@remix-run/node'
import Papa from 'papaparse'
import { createQuizWithQuestions } from '#app/data/quiz.server.ts'
import { type CSVQuestion } from '../types'

// Functie om headers te vertalen naar taalcodes
function translateToLanguageCode(header: string): string {
	const lowerHeader = header.toLowerCase().trim()
	switch (lowerHeader) {
		case 'fr':
		case 'frans':
			return 'fr'
		case 'en':
		case 'engels':
			return 'en'
		case 'de':
		case 'duits':
			return 'de'
		default:
			return 'nl'
	}
}

export async function handleCsvUpload(formData: FormData, userId: string) {
	const file = formData.get('csvFile') as File
	console.log('File is: ' + file)
	if (!file) {
		return json({ error: 'CSV file is required' }, { status: 400 })
	}

	const content = await file.text()

	// Check if file content is empty
	if (!content.trim()) {
		console.log('CSV file is leeg')
		return json({ error: 'CSV file is empty' }, { status: 400 })
	}

	const title = file.name.replace('.csv', '')

	let questions: CSVQuestion[]
	let questionLanguage = 'nl'
	let answerLanguage = 'nl'
	try {
		// Gebruik PapaParse om CSV-string naar JSON te converteren en typ de output correct
		const parsedResult = Papa.parse<CSVQuestion>(content, {
			header: true,
			delimiter: ';', // scheidingsteken in de csv
			dynamicTyping: true,
			skipEmptyLines: true,
			transformHeader: header => header.trim(), // Zorgt dat header wordt gelezen zonder quotes
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

		// Vertaal de headers naar de gewenste taalcodes
		const [questionHeader, answerHeader] = headers
		questionLanguage = translateToLanguageCode(questionHeader!)
		answerLanguage = translateToLanguageCode(answerHeader!)

		// Verwacht de eerste twee kolommen als de vraag- en antwoordvelden
		const [questionKey, answerKey] = headers

		// Controleer of questionKey en answerKey strings zijn voordat ze worden gebruikt
		if (typeof questionKey === 'string' && typeof answerKey === 'string') {
			questions = parsedResult.data.map((row: any, index: number) => ({
				orderIndex: index,
				question: row[questionKey] ?? '', // Voeg een fallback toe voor veiligheid
				answer: row[answerKey] ?? '', // Voeg een fallback toe voor veiligheid
			}))
		} else {
			return json(
				{ error: 'Failed to parse CSV: Invalid headers.' },
				{ status: 400 },
			)
		}

		console.log(`questions array ziet er zo uit:`)
		console.log(questions)

		// Filter out empty rows
		questions = questions.filter(q => q.question?.trim() && q.answer?.trim())

		console.log(`questions array ziet er zo uit:`)
		console.log(questions)

		// Check if questions array is empty
		if (questions.length === 0) {
			console.log('Geen geldige vragen gevonden in de CSV file')
			return json(
				{ error: 'No valid questions found in CSV file' },
				{ status: 400 },
			)
		}

		// Converteer de questions en kijk of geldig question en answer formaten betreft
		questions = questions.map((q, index) => ({
			orderIndex: index,
			question: q.question,
			answer: q.answer,
		}))
	} catch (error) {
		return json(
			{ error: 'Failed to parse CSV', details: (error as Error).message },
			{ status: 400 },
		)
	}

	const newQuiz = await createQuizWithQuestions(
		title,
		userId,
		questionLanguage,
		answerLanguage,
		questions,
	)

	return json({ newQuiz })
}
