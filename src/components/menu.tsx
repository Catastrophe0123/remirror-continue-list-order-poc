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
				square
			</button>
			<button
				onClick={() => {
					// console.log('calling the function');
					commands.toggleOrderedList();
					// commands.toggleContinueOrderList();
				}}>
				list
			</button>
		</div>
	);
};
