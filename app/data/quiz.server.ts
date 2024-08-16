// app/data/quiz.server.ts
import { type QuestionSummary } from '#app/types/index.ts'
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

export async function createQuiz(title: string, userId: string) {
	return await prisma.quiz.create({
		data: {
			title,
			ownerId: userId,
		},
	})
}

export async function createQuizWithQuestions(
	title: string,
	userId: string,
	questions: { question: string; answer: string }[],
) {
	return await prisma.quiz.create({
		data: {
			title,
			ownerId: userId,
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

export async function updateQuizTitle(
	quizId: string,
	newTitle: string,
	userId: string,
) {
	return await prisma.quiz.updateMany({
		where: {
			id: quizId,
			ownerId: userId,
		},
		data: {
			title: newTitle,
		},
	})
}
