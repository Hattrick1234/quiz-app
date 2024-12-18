// app/data/quiz.server.ts
import {
	type QuestionOrder,
	type QuestionSummary,
	type QuestionReadOption,
	type AskingOrder,
	type DifficultSetting,
} from '#app/types/index.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function getQuestionsByQuizId(quizId: string) {
	return await prisma.question.findMany({
		select: {
			id: true,
			orderIndex: true,
			question: true,
			answer: true,
			difficult: true,
		},
		where: {
			quizId: quizId,
		},
		orderBy: {
			orderIndex: 'asc', // Sorteer de vragen op volgorde van de orderIndex
		},
	})
}

export async function addQuestion(quizId: string, question: QuestionSummary) {
	const newQuestion = await prisma.question.create({
		data: {
			quizId,
			orderIndex: question.orderIndex,
			question: question.question,
			answer: question.answer,
			difficult: question.difficult,
		},
	})
	return newQuestion
}

export async function updateQuestionById(
	//alle velden die je niet aanlevert blijven hun huidige waarde behouden
	questionId: string,
	data: {
		orderIndex?: number
		question?: string
		answer?: string
		difficult?: boolean
	},
) {
	try {
		const updatedQuestion = await prisma.question.update({
			where: { id: questionId },
			data: {
				...data,
				updatedAt: new Date(), // Zorg dat `updatedAt` automatisch bijgewerkt wordt
			},
		})

		return updatedQuestion
	} catch (error) {
		throw new Error(`Error updating question with ID ${questionId}: ${error}`)
	}
}

export async function updateQuestions(
	quizId: string,
	questions: QuestionSummary[],
) {
	const updatePromises = questions.map(question =>
		prisma.question.update({
			where: { id: question.id },
			data: {
				orderIndex: question.orderIndex,
				question: question.question,
				answer: question.answer,
				difficult: question.difficult,
			},
		}),
	)

	await Promise.all(updatePromises)
}

// Functie om een specifieke vraag te verwijderen op basis van het ID
export async function deleteQuestions(questionId: string) {
	try {
		await prisma.question.delete({
			where: {
				id: questionId,
			},
		})
		return { success: true }
	} catch (error) {
		console.error('Error deleting question:', error)
		throw new Error('Failed to delete question')
	}
}

export async function getQuizById(userId: string, quizId: string) {
	return await prisma.quiz.findFirst({
		where: {
			id: quizId,
			ownerId: userId,
		},
	})
}

export async function createQuiz(
	title: string,
	userId: string,
	questionLanguage: string,
	answerLanguage: string,
) {
	return await prisma.quiz.create({
		data: {
			title,
			ownerId: userId,
			questionLanguage,
			answerLanguage,
		},
	})
}

export async function createQuizWithQuestions(
	title: string,
	userId: string,
	questionLanguage: string,
	answerLanguage: string,
	questions: { orderIndex: number; question: string; answer: string }[],
) {
	return await prisma.quiz.create({
		data: {
			title,
			ownerId: userId,
			questionLanguage,
			answerLanguage,
			questions: {
				create: questions,
			},
		},
	})
}

export async function deleteQuiz(quizId: string) {
	// Gebruik een transactie om ervoor te zorgen dat alles tegelijk wordt uitgevoerd of niets als er een fout optreedt
	return await prisma.$transaction(async prisma => {
		// Verwijder eerst alle gerelateerde records uit de Question- en QuizSetting-tabellen
		await prisma.question.deleteMany({
			where: {
				quizId: quizId,
			},
		})

		await prisma.quizSetting.deleteMany({
			where: {
				quizId: quizId,
			},
		})

		// Verwijder dan de quiz zelf
		return await prisma.quiz.delete({
			where: {
				id: quizId,
			},
		})
	})
}

export async function updateQuiz(
	quizId: string,
	newTitle: string,
	userId: string,
	questionLanguage: string,
	answerLanguage: string,
) {
	return await prisma.quiz.updateMany({
		where: {
			id: quizId,
			ownerId: userId,
		},
		data: {
			title: newTitle,
			questionLanguage,
			answerLanguage,
		},
	})
}

// Functie om instellingen op te halen op basis van quizId en userId
export async function getQuizSettings(userId: string, quizId: string) {
	return await prisma.quizSetting.findUnique({
		where: {
			userId_quizId: {
				userId,
				quizId,
			},
		},
	})
}

// Functie om instellingen op te slaan of bij te werken
export async function saveQuizSettings(
	userId: string,
	quizId: string,
	order: QuestionOrder,
	readOption: QuestionReadOption,
	askingOrder: AskingOrder,
	difficultSetting: DifficultSetting,
	showAnswerAtStart: boolean,
) {
	return await prisma.quizSetting.upsert({
		where: {
			userId_quizId: {
				userId,
				quizId,
			},
		},
		update: {
			order,
			readOption,
			askingOrder,
			difficultSetting,
			showAnswerAtStart,
		},
		create: {
			userId,
			quizId,
			order,
			readOption,
			askingOrder,
			difficultSetting,
			showAnswerAtStart,
		},
	})
}
