import React from 'react'

const DIACRITICS = [
	// 'À',
	// 'Â',
	'á',
	'à',
	'â',
	// 'Ç',
	'ç',
	// 'É',
	// 'È',
	// 'Ë',
	'é',
	'è',
	'ê',
	'ë',
	// 'Î',
	'î',
	'í',
	'ï',
	// 'Ï',
	// 'Ó',
	'ó',
	'ô',
	// 'Œ',
	'œ',
	// 'Ö',
	'ö',
	// 'Ú',
	// 'Ù',
	'û',
	'ù',
	// 'Ü',
	'ü',
]

interface DiacriticsInputProps {
	onInsert: (char: string) => void
}

const DiacriticsInput: React.FC<DiacriticsInputProps> = ({ onInsert }) => {
	return (
		<div className="diacritics-container mb-4">
			<p className="mb-2">Klik op een teken om het in te voegen:</p>
			<div className="flex flex-wrap">
				{DIACRITICS.map((char, index) => (
					<button
						key={index}
						type="button"
						className="m-1 rounded bg-gray-200 px-2 py-1 hover:bg-gray-300"
						onClick={() => onInsert(char)}
					>
						{char}
					</button>
				))}
			</div>
		</div>
	)
}

export default DiacriticsInput
