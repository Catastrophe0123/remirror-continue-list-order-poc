import { useCommands } from '@remirror/react';

export const Menu = () => {
	const commands = useCommands();

	return (
		<div>
			<button
				onClick={() => {
					commands.toggleContinueOrderList();
				}}>
				Continue List
			</button>
			<button
				onClick={() => {
					commands.toggleOrderedList();
					// commands.toggleContinueOrderList();
				}}>
				list
			</button>
			<button
				onClick={() => {
					commands.changeListStyle('square');
					// commands.toggleContinueOrderList();
				}}>
				SQUARE
			</button>
			<button
				onClick={() => {
					commands.changeListStyle('circle');
					// commands.toggleContinueOrderList();
				}}>
				CIRCLE
			</button>
			<button
				onClick={() => {
					commands.toggleOrderedList();
					// commands.toggleContinueOrderList();
				}}>
				custom toggle list
			</button>
		</div>
	);
};
