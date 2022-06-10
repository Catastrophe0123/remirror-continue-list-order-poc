import { useCommands } from '@remirror/react';

export const Menu = () => {
	const commands = useCommands();

	return (
		<div>
			<button
				onClick={() => {
					console.log('calling the function');
					commands.toggleContinueOrderList();
				}}>
				Continue List
			</button>
			<button
				onClick={() => {
					// console.log('calling the function');
					commands.toggleOrderedList();
					// commands.toggleContinueOrderList();
				}}>
				list
			</button>
			<button
				onClick={() => {
					// console.log('calling the function');
					commands.changeListStyle('square');
					// commands.toggleContinueOrderList();
				}}>
				SQUARE
			</button>
			<button
				onClick={() => {
					// console.log('calling the function');
					commands.changeListStyle('circle');
					// commands.toggleContinueOrderList();
				}}>
				CIRCLE
			</button>
			<button
				onClick={() => {
					// console.log('calling the function');
					commands.toggleOrderedList();
					// commands.toggleContinueOrderList();
				}}>
				custom toggle list
			</button>
		</div>
	);
};
