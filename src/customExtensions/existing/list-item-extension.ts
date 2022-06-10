import {
	ApplySchemaAttributes,
	command,
	CommandFunction,
	extension,
	ExtensionPriority,
	ExtensionTag,
	isBoolean,
	isNodeSelection,
	KeyBindings,
	NodeExtension,
	NodeExtensionSpec,
	NodeSpecOverride,
	NodeViewMethod,
	ProsemirrorAttributes,
	ProsemirrorNode,
	Static,
	findParentNode,
} from '@remirror/core';
import { NodeType } from '@remirror/pm/model';
import { NodeSelection } from '@remirror/pm/state';
import { ExtensionListTheme } from '@remirror/theme';
import { assertGet } from 'remirror';
import { dedentListCommand } from './list-command-dedent';
import { indentListCommand } from './list-command-indent';

import { liftListItemOutOfList, splitListItem } from './list-commands';
import { createCustomMarkListItemNodeView } from './list-item-node-view';
import { ListItemSharedExtension } from './list-item-shared-extension';

/**
 * Creates the node for a list item.
 */
@extension<ListItemOptions>({
	defaultOptions: { enableCollapsible: false },
	staticKeys: ['enableCollapsible'],
})
export class ListItemExtension extends NodeExtension<ListItemOptions> {
	get name() {
		return 'listItem' as const;
	}

	createTags() {
		return [ExtensionTag.ListItemNode];
	}

	createNodeSpec(
		extra: ApplySchemaAttributes,
		override: NodeSpecOverride
	): NodeExtensionSpec {
		return {
			content: 'paragraph block*',
			defining: true,
			draggable: false,
			...override,
			attrs: {
				...extra.defaults(),
				closed: { default: false },
				nested: { default: false },
				style: { default: {} },
			},
			parseDOM: [
				{
					tag: 'li',
					getAttrs: (dom) => {
						console.log('DOM : ', dom);
						return {
							...extra.parse(dom),
						};
					},
					// priority: ExtensionPriority.Lowest, // Make sure this rule has lower priority then `TaskListItemExtension`'s
				},
				...(override.parseDOM ?? []),
			],
			toDOM: (node) => {
				console.log('ondee :', node);
				const attrs = extra.dom(node);
				console.log('attrs : ', attrs);

				if (node.attrs.style) {
					attrs.style = node.attrs.style;
				}

				return ['li', { ...attrs }, 0];
			},
		};
	}

	// createNodeViews(): NodeViewMethod | Record<string, never> {
	// 	if (!this.options.enableCollapsible) {
	// 		return {};
	// 	}

	// 	console.log('thisqqq');
	// 	return (node, view, getPos) => {
	// 		const mark: HTMLElement = document.createElement('div');
	// 		mark.classList.add(ExtensionListTheme.COLLAPSIBLE_LIST_ITEM_BUTTON);
	// 		mark.contentEditable = 'false';
	// 		console.log('this runnin?');
	// 		mark.addEventListener('click', () => {
	// 			if (mark.classList.contains('disabled')) {
	// 				return;
	// 			}

	// 			const pos = (getPos as () => number)();
	// 			const selection = NodeSelection.create(view.state.doc, pos);
	// 			view.dispatch(view.state.tr.setSelection(selection));
	// 			this.store.commands.toggleListItemClosed();
	// 			return true;
	// 		});

	// 		return createCustomMarkListItemNodeView({
	// 			mark,
	// 			node,
	// 			updateDOM: updateNodeViewDOM,
	// 			updateMark: updateNodeViewMark,
	// 			// update: (...q) => {
	// 			// 	console.log('qqd');
	// 			// },
	// 		});
	// 	};
	// }

	createKeymap(): KeyBindings {
		return {
			Enter: splitListItem(this.type),
			Tab: (params: any) => {
				console.log('this ran in side the tab callback : ', params);
				const { $from, $to } = params.tr.selection;
				const range = $from.blockRange($to);
				console.log('range', range);
				if (range.depth + 2 >= 10) {
					return false;
				}
				return indentListCommand(params);
			},
			'Shift-Tab': (params: any) => {
				console.log('in the shift callback : ', params);
				const { $from, $to } = params.tr.selection;
				const range = $from.blockRange($to);
				console.log('range in dedent', range);
				return dedentListCommand(params);
			},
		};
	}

	@command()
	changeListStyle(style: string): CommandFunction {
		return (params) => {
			let { state, tr, dispatch, view } = params;

			const selection = tr.selection;

			const parentListItem = findParentNode({
				predicate: (node) =>
					node.type === node.type.schema.nodes.orderedList,
				selection: tr.selection,
			});

			// const grandParent = findParentNode({
			// 	predicate: (node) =>
			// 		node.type === node.type.schema.nodes.listItem,
			// 	// @ts-ignore
			// 	selection: {}
			// 	},
			// });

			// console.log('thatha : ', grandParent);
			console.log('parentlistitem : ', parentListItem);

			console.log('selection : ', selection);
			let flag = false;
			tr.doc.nodesBetween(
				selection.from,
				// parentListItem!.start,
				selection.to,
				(node, pos, parent) => {
					// console.log('nodes between : ', node, parent);
					console.log(
						'check similar : ',
						parentListItem!.node,
						node,
						parent
					);

					if (node.type.name === 'listItem') {
						// found the list item
						// tr.setNodeMarkup(pos, undefined, {
						// 	style: 'list-style-type: square',
						// });
						// let newtr = view?.state.tr.setNodeMarkup(
						// 	pos,
						// 	undefined,
						// 	{
						// 		style: 'list-style-type: square',
						// 	}
						// );
						console.log('the flag thing : ', node, parent);
						if (parentListItem!.node !== parent) {
							// skipping this
							console.log('parnet :', node, parent);
							console.log('skip');
						} else {
							console.log('setting for ', node);
							tr = tr.setNodeMarkup(pos, undefined, {
								style: `list-style-type: ${style}`,
								// 'list-style-type': 'square',
								// closed: true,
							});
							// console.log('Node', node);
						}
					}
				}
			);
			console.log('tr : ', tr);
			dispatch!(tr);

			return true;
		};
	}

	// createExtensions() {
	// 	return [new ListItemSharedExtension()];
	// }

	/**
	 * Toggles the current list item.
	 *
	 * @param closed - the `closed` attribute. If it's a boolean value, then it
	 * will be set as an attribute. If it's undefined, then the `closed` attribuate
	 * will be toggled.
	 */
	@command()
	toggleListItemClosed(closed?: boolean | undefined): CommandFunction {
		return ({ state: { tr, selection }, dispatch }) => {
			// Make sure the list item is selected. Otherwise do nothing.
			if (
				!isNodeSelection(selection) ||
				selection.node.type.name !== this.name
			) {
				return false;
			}

			const { node, from } = selection;
			closed = isBoolean(closed) ? closed : !node.attrs.closed;
			dispatch?.(
				tr.setNodeMarkup(from, undefined, { ...node.attrs, closed })
			);

			return true;
		};
	}

	/**
	 * Lift the content inside a list item around the selection out of list
	 */
	@command()
	liftListItemOutOfList(
		listItemType?: NodeType | undefined
	): CommandFunction {
		return liftListItemOutOfList(listItemType ?? this.type);
	}
}

function updateNodeViewDOM(node: ProsemirrorNode, dom: HTMLElement) {
	node.attrs.closed
		? dom.classList.add(ExtensionListTheme.COLLAPSIBLE_LIST_ITEM_CLOSED)
		: dom.classList.remove(ExtensionListTheme.COLLAPSIBLE_LIST_ITEM_CLOSED);
}

function updateNodeViewMark(node: ProsemirrorNode, mark: HTMLElement) {
	node.childCount <= 1
		? mark.classList.add('disabled')
		: mark.classList.remove('disabled');
}

export interface ListItemOptions {
	/**
	 * Set this to true to support toggling.
	 */
	enableCollapsible?: Static<boolean>;
}

export type ListItemAttributes = ProsemirrorAttributes<{
	/**
	 * @default false
	 */
	closed: boolean;
	/**
	 * @default false
	 */
	nested: boolean;
	style: any;
}>;

// declare global {
// 	namespace Remirror {
// 		interface AllExtensions {
// 			listItem: ListItemExtension;
// 		}
// 	}
// }
