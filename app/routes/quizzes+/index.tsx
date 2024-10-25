import { type Quiz } from '@prisma/client'
import {
	json,
	redirect,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/node'
import { Link, useLoaderData, useFetcher } from '@remix-run/react'
import Papa from 'papaparse'
import { useEffect, useState } from 'react'
import {
	createQuiz,
	createQuizWithQuestions,
	deleteQuiz,
	updateQuiz,
} from '#app/data/quiz.server.ts'
import { type QuizType, type CSVQuestion } from '#app/types/index.js'
import { requireUserId } from '#app/utils/auth.server.js'
import { prisma } from '#app/utils/db.server.ts'

export async function loader({ request }: LoaderFunctionArgs) {
	const userId = await requireUserId(request)

	const quizzes = await prisma.quiz.findMany({
		select: {
			id: true,
			title: true,
			createdAt: false,
			updatedAt: false,
			questionLanguage: true,
			answerLanguage: true,
		},
		where: {
			ownerId: userId,
		},
		orderBy: { title: 'asc' },
	})

	return json(quizzes) // Retourneert de array van quizzes direct
}

// Action voor het aanmaken en verwijderen van quizzes
export async function action({ request }: ActionFunctionArgs) {
	const userId = await requireUserId(request)
	const formData = await request.formData()
	const intent = formData.get('intent')
	const defaultLanguage = 'nl'
	console.log(`Intent is: ${intent}`)

	if (intent === 'create') {
		const title = formData.get('title') as string
		const questionLanguage = formData.get('questionLanguage') as string
		const answerLanguage = formData.get('answerLanguage') as string
		if (!title) {
			return json({ error: 'Title is required' }, { status: 400 })
		}

		const newQuiz = await createQuiz(
			title,
			userId,
			questionLanguage,
			answerLanguage,
		)

		return json({ newQuiz })
	}

	if (intent === 'uploadCsv') {
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
		try {
			// Gebruik PapaParse om CSV-string naar JSON te converteren en typ de output correct
			const parsedResult = Papa.parse<CSVQuestion>(content, {
				header: true,
				delimiter: ';', //scheidingsteken in de csv
				dynamicTyping: true,
				skipEmptyLines: true,
				transformHeader: header => header.trim(), // Zorgt dat header wordt gelezen zonder quotes
			})
			// questions = parsedResult.data // Pak de data uit de parse-resultaten

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

			// // Map de headers naar de standaard `question` en `answer` met `orderIndex`
			// questions = parsedResult.data.map((row: any, index: number) => ({
			// 	orderIndex: index,
			// 	// question: row[questionKey],
			// 	// answer: row[answerKey],
			// 	question: row[questionKey] ?? '', // Voeg een fallback toe voor veiligheid
			// 	answer: row[answerKey] ?? '', // Voeg een fallback toe voor veiligheid
			// }))

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

			//Converteer de questions en kijk of geldig question en answer formaten betreft
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
			defaultLanguage,
			defaultLanguage,
			questions,
		)

		return json({ newQuiz })
	}

	//onderstaande acties hebben een quizid nodig stop als die er niet is
	const quizId = formData.get('quizId') as string
	if (!quizId) {
		console.log('Quiz ID is nodig maar niet meegegeven')
		return json({ error: 'Quiz ID is required' }, { status: 400 })
	}

	if (intent === 'delete') {
		await deleteQuiz(quizId)

		return json({ success: true })
	}

	if (intent === 'update') {
		const newTitle = formData.get('newTitle')
		const newQuestionLanguage = formData.get('newQuestionLanguage')
		const newAnswerLanguage = formData.get('newAnswerLanguage')
		console.log(newQuestionLanguage)
		console.log(newAnswerLanguage)
		if (typeof newTitle !== 'string' || !newTitle.trim()) {
			return json({ error: 'Invalid title' }, { status: 400 })
		}
		if (typeof newQuestionLanguage !== 'string' || !newTitle.trim()) {
			return json({ error: 'Invalid questionLanguag' }, { status: 400 })
		}
		if (typeof newAnswerLanguage !== 'string' || !newTitle.trim()) {
			return json({ error: 'Invalid answerLanguage' }, { status: 400 })
		}

		await updateQuiz(
			quizId,
			newTitle,
			userId,
			newQuestionLanguage,
			newAnswerLanguage,
		)
		return redirect('/quizzes') // Redirect to refresh the page
	}

	return json({ error: 'Invalid action' }, { status: 400 })
}

export default function UsersRoute() {
	const quizzes = useLoaderData<Quiz[]>()
	const fetcher = useFetcher()
	const [editingQuizId, setEditingQuizId] = useState<string | null>(null)
	const [newTitle, setNewTitle] = useState<string>('')
	const [questionLanguage, setQuestionLanguage] = useState<string>('nl')
	const [answerLanguage, setAnswerLanguage] = useState<string>('nl')
	const [filterLanguage, setFilterLanguage] = useState<string | null>(null)

	// Functie voor het toepassen van de filter
	const filteredQuizzes = quizzes.filter(quiz => {
		if (!filterLanguage) return true // Geen filter, toon alles
		// Nederlands filter: beide velden moeten 'nl' zijn
		if (filterLanguage === 'nl') {
			return quiz.questionLanguage === 'nl' && quiz.answerLanguage === 'nl'
		}
		//bij andere talen moet een van de talen overeenkomen met het filter
		return (
			quiz.questionLanguage === filterLanguage ||
			quiz.answerLanguage === filterLanguage
		)
	})

	const handleEditClick = (quiz: QuizType) => {
		setEditingQuizId(quiz.id)
		setNewTitle(quiz.title)
		setQuestionLanguage(quiz.questionLanguage) // Vul de huidige vraagtaal in
		setAnswerLanguage(quiz.answerLanguage)
	}

	const handleCancelEdit = () => {
		setEditingQuizId(null)
		setNewTitle('')
		setQuestionLanguage('nl') // Reset naar default taal
		setAnswerLanguage('nl') // Reset naar default taal
	}

	const handleFilterClick = (language: string | null) => {
		//opslaan en verwijderen van de filtertaal via local storage zodat als je later terugkomt naar deze pagina hij nog steeds weet wat laatste filterinstelling was
		setFilterLanguage(language)
		if (language) {
			localStorage.setItem('quizFilterLanguage', language)
		} else {
			localStorage.removeItem('quizFilterLanguage') // Verwijder de filter als er geen filter is
		}
	}

	useEffect(() => {
		//Wanneer pagina ingeladen wordt eerst kijken of er al een filter in local storage staat, zo ja dan filter daarop zetten
		const savedFilter = localStorage.getItem('quizFilterLanguage')
		if (savedFilter) {
			setFilterLanguage(savedFilter)
		}
	}, [])

	return (
		<div className="grid place-items-center">
			<h1>Kies een overhoring of quiz uit:</h1>

			{/* Filteropties */}
			<div className="mb-4 flex space-x-2">
				<button
					onClick={() => handleFilterClick(null)}
					className={`rounded px-4 py-2 ${
						!filterLanguage ? 'bg-blue-500 text-white' : 'bg-gray-200'
					}`}
				>
					Toon Alles
				</button>
				<button
					onClick={() => handleFilterClick('nl')}
					className={`rounded px-4 py-2 ${
						filterLanguage === 'nl' ? 'bg-blue-500 text-white' : 'bg-gray-200'
					}`}
				>
					Nederlands
				</button>
				<button
					onClick={() => handleFilterClick('en')}
					className={`rounded px-4 py-2 ${
						filterLanguage === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-200'
					}`}
				>
					Engels
				</button>
				<button
					onClick={() => handleFilterClick('fr')}
					className={`rounded px-4 py-2 ${
						filterLanguage === 'fr' ? 'bg-blue-500 text-white' : 'bg-gray-200'
					}`}
				>
					Frans
				</button>
				<button
					onClick={() => handleFilterClick('de')}
					className={`rounded px-4 py-2 ${
						filterLanguage === 'de' ? 'bg-blue-500 text-white' : 'bg-gray-200'
					}`}
				>
					Duits
				</button>
			</div>

			<ul id="quiz-list">
				{filteredQuizzes.map(quiz => (
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
								{/* Taal dropdown voor vraag */}
								<select
									name="newQuestionLanguage"
									value={questionLanguage}
									onChange={e => setQuestionLanguage(e.target.value)}
									className="ml-2 rounded border px-2 py-1"
								>
									<option value="nl">Nederlands</option>
									<option value="en">Engels</option>
									<option value="fr">Frans</option>
									<option value="de">Duits</option>
								</select>
								{/* Taal dropdown voor antwoord */}
								<select
									name="newAnswerLanguage"
									value={answerLanguage}
									onChange={e => setAnswerLanguage(e.target.value)}
									className="ml-2 rounded border px-2 py-1"
								>
									<option value="nl">Nederlands</option>
									<option value="en">Engels</option>
									<option value="fr">Frans</option>
									<option value="de">Duits</option>
								</select>

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
									Close editing
								</button>
							</fetcher.Form>
						) : (
							<>
								<Link to={quiz.id} className="text-blue-500 hover:underline">
									<h2>{quiz.title}</h2>
								</Link>
								<div className="flex items-center">
									<button
										type="button"
										onClick={() => handleEditClick(quiz)}
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
									<a
										href={`/api/download-quiz?quizId=${quiz.id}`}
										className="ml-4 rounded bg-blue-500 px-2 py-1 text-white"
									>
										Download
									</a>
									{/* Start quiz button with saved settings */}
									<Link
										to={`/quizzes/${quiz.id}/play`}
										className="ml-4 rounded bg-green-500 px-2 py-1 text-white"
									>
										Start
									</Link>
								</div>
							</>
						)}
					</li>
				))}
			</ul>

			{/* Formulier voor het aanmaken van een nieuwe quiz */}
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
				{/* Voeg taalselectie toe voor de vragen */}
				<label className="ml-4">
					Taal van vragen:
					<select
						name="questionLanguage"
						className="ml-2 rounded border px-2 py-1"
					>
						<option value="nl">Nederlands</option>
						<option value="en">Engels</option>
						<option value="fr">Frans</option>
						<option value="de">Duits</option>
					</select>
				</label>

				{/* Voeg taalselectie toe voor de antwoorden */}
				<label className="ml-4">
					Taal van antwoorden:
					<select
						name="answerLanguage"
						className="ml-2 rounded border px-2 py-1"
					>
						<option value="nl">Nederlands</option>
						<option value="en">Engels</option>
						<option value="fr">Frans</option>
						<option value="de">Duits</option>
					</select>
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

			{/* Formulier voor het uploaden van een CSV */}
			<fetcher.Form
				method="post"
				encType="multipart/form-data"
				className="mt-8"
			>
				<label>
					Upload CSV:
					<input
						type="file"
						name="csvFile"
						accept=".csv"
						className="ml-2 rounded border px-2 py-1"
					/>
				</label>
				<button
					type="submit"
					name="intent"
					value="uploadCsv"
					className="ml-4 rounded bg-blue-500 px-4 py-2 text-white"
				>
					Upload CSV and Create Quiz
				</button>
			</fetcher.Form>
			{/* Instructie voor het CSV-bestand */}
			<p className="mt-2 text-sm text-gray-600">
				Scheidingsteken in csv bestand moet een ; zijn.
			</p>
		</div>
	)
}
