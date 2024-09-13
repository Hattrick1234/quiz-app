// app/data/quiz.server.ts
import {
	type QuestionOrder,
	type QuestionSummary,
	type QuestionReadOption,
} from '#app/types/index.ts'
import { prisma } from '#app/utils/db.server.ts'

export async function updateQuestions(
	quizId: string,
	questions: QuestionSummary[],
) {
	const updatePromises = questions.map(question =>
		prisma.question.update({
			where: { id: question.id },
			data: {
				question: question.question,
				answer: question.answer,
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

export async function addQuestion(quizId: string, question: QuestionSummary) {
	const newQuestion = await prisma.question.create({
		data: {
			quizId,
			question: question.question,
			answer: question.answer,
		},
	})
	return newQuestion
}

export async function getQuizById(userId: string, quizId: string) {
	return await prisma.quiz.findFirst({
		where: {
			id: quizId,
			ownerId: userId,
		},
	})
}

export async function getQuestionsByQuizId(quizId: string) {
	return await prisma.question.findMany({
		select: {
			id: true,
			question: true,
			answer: true,
		},
		where: {
			quizId: quizId,
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
	questions: { question: string; answer: string }[],
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
	return await prisma.quiz.delete({
		where: {
			id: quizId,
		},
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
		},
		create: {
			userId,
			quizId,
			order,
			readOption,
		},
	})
}
