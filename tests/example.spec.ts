import { renderEditor } from 'jest-remirror';
// import { EmojiExtension } from '@remirror/extension-emoji';
import { ListItemExtension } from '../src/customExtensions/existing/list-item-extension';
import { ContinueListOrderExtension } from '../src/customExtensions/ContinueListOrderExtension';
import {
	BulletListExtension,
	OrderedListExtension,
	TaskListExtension,
} from 'remirror/extensions';

export function setupListEditor() {
	const editor = renderEditor([
		new ListItemExtension({}),
		new ContinueListOrderExtension(),
		new BulletListExtension({}),
		new OrderedListExtension(),
		new TaskListExtension(),
	]);
	const {
		nodes: {
			doc,
			paragraph: p,
			bulletList: ul,
			orderedList: ol,
			listItem: li,
			taskList,
		},
		attributeNodes: { taskListItem, orderedList, listItem },
	} = editor;

	const checked = taskListItem({ checked: true });
	const unchecked = taskListItem({ checked: false });

	return {
		editor,
		doc,
		p,
		ul,
		li,
		ol,
		taskList,
		orderedList,
		checked,
		unchecked,
		taskListItem,
		listItem,
	};
}

// test('emoticons replaced with emoji', () => {
// 	const {
// 		nodes: { p, doc },
// 		add,
// 	} = renderEditor({ plainNodes: [], others: [new EmojiExtension()] });

// 	add(doc(p('<cursor>')))
// 		.insertText(':-)')
// 		.callback((content) => {
// 			expect(content.state.doc).toEqualRemirrorDocument(doc(p('😃')));
// 		});
// });

describe('create a list', () => {
	const {
		taskList,
		li,
		doc,
		p,
		ul,
		ol,
		listItem,
		orderedList,
		unchecked,
		checked,
		editor,
	} = setupListEditor();

	it('creates a bulletList', () => {
		editor.add(doc(p(''))).insertText('- ');
		expect(editor.doc).toEqualProsemirrorNode(doc(ul(li(p('')))));

		editor.add(doc(p(''))).insertText('+ ');
		expect(editor.doc).toEqualProsemirrorNode(doc(ul(li(p('')))));

		editor.add(doc(p(''))).insertText('* ');
		expect(editor.doc).toEqualProsemirrorNode(doc(ul(li(p('')))));
	});

	it('continues previous list order', () => {
		editor
			.add(doc(p('')))
			.insertText('1. hello world')
			.press('Enter')
			.insertText('hello')
			.press('Enter')
			.press('Enter')
			.insertText('outside list')
			.press('Enter')
			.insertText('another list')
			.commands.toggleContinueOrderList();

		let expectation = doc(
			ol(li(p('hello world')), li(p('hello'))),
			p('outside list'),
			orderedList({ order: 3 })(li(p('another list')))
		);

		expect(editor.view.state.doc).toEqualProsemirrorNode(expectation);
	});

	it('changes list style of a list item to square', () => {
		const action = doc(ol(li(p('hello world')), li(p('hello'))));
		editor.add(action).commands.changeListStyle('square');

		const expectation = doc(
			ol(
				li(p('hello world')),
				listItem({ style: 'list-style-type: square' })(p('hello'))
			)
		);

		expect(editor.view.state.doc).toEqualProsemirrorNode(expectation);
	});

	it('changes list style of a list item to circle', () => {
		const action = doc(ol(li(p('hello world')), li(p('hello'))));
		editor.add(action).commands.changeListStyle('circle');

		const expectation = doc(
			ol(
				li(p('hello world')),
				listItem({ style: 'list-style-type: circle' })(p('hello'))
			)
		);

		expect(editor.view.state.doc).toEqualProsemirrorNode(expectation);
	});
});
