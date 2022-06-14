import {
	command,
	CommandFunction,
	ExtensionTag,
	NodeType,
	NodeView,
	NodeViewMethod,
	CommandFunctionProps,
	EditorState,
	environment,
	KeyBindings,
	ApplySchemaAttributes,
	isElementDomNode,
	NodeExtensionSpec,
	NodeSpecOverride,
	NodeExtension,
} from '@remirror/core';
import {
	isEditorState,
	isSelection,
	assertGet,
	chainableEditorState,
	findParentNode,
	keyBinding,
	KeyBindingProps,
	NamedShortcut,
	findParentNodeOfType,
} from 'remirror';
import { wrapInList } from '@remirror/pm/schema-list';

import {
	OrderedListExtension,
	toggleList,
	wrapSelectedItems,
} from 'remirror/extensions';
import { Fragment, Node, Schema } from '@remirror/pm/model';
import { Decoration, DecorationSet } from '@remirror/pm/view';
// import { liftListItemOutOfList } from '@remirror/extension-list';
// import { deepChangeListType, isList, liftListItemOutOfList } from './utils';
import { InputRule, wrappingInputRule } from '@remirror/pm/inputrules';
import { indentList, indentListCommand } from './existing/list-command-indent';
import { dedentListCommand } from './existing/list-command-dedent';
import {
	deepChangeListType,
	liftListItemOutOfList,
} from './existing/list-commands';
import { isList } from './existing/list-utils';
import { ListItemSharedExtension } from './existing/list-item-shared-extension';

export class ContinueListOrderExtension extends NodeExtension {
	get name() {
		return 'orderedList' as const;
	}

	createTags() {
		return [ExtensionTag.Block, ExtensionTag.ListContainerNode];
	}

	// createExtension

	createNodeSpec(
		extra: ApplySchemaAttributes,
		override: NodeSpecOverride
	): NodeExtensionSpec {
		return {
			content: 'listItem+',
			...override,
			attrs: {
				...extra.defaults(),
				order: {
					default: 1,
				},
			},
			parseDOM: [
				{
					tag: 'ol',
					getAttrs: (node) => {
						if (!isElementDomNode(node)) {
							return {};
						}

						return {
							...extra.parse(node),
							order: +(node.getAttribute('start') ?? 1),
						};
					},
				},
				...(override.parseDOM ?? []),
			],
			toDOM: (node) => {
				const extraAttributes = extra.dom(node);

				return node.attrs.order === 1
					? ['ol', extraAttributes, 0]
					: [
							'ol',
							{ ...extraAttributes, start: node.attrs.order },
							0,
					  ];
			},
		};
	}

	createExtensions() {
		return [new ListItemSharedExtension()];
	}

	/**
	 * Toggle the ordered list for the current selection.
	 */

	// @ts-ignore
	@keyBinding({
		shortcut: NamedShortcut.OrderedList,
		command: 'toggleOrderedList',
	})
	listShortcut(props: KeyBindingProps): boolean {
		return this.toggleOrderedList()(props);
	}

	/**
	 *
	 * @param node the node to find
	 * @param parentNode the parent node. passing the doc node(root node) for now.
	 * @returns start and end position of the node
	 */
	getNodePositions(node: Node, parentNode: Node) {
		let start: number = 0,
			end: number = 0;
		parentNode.forEach((childNode, pos) => {
			if (childNode.eq(node)) {
				start = pos;
				end = pos + node.nodeSize;
			}
		});

		return { start, end };
	}

	// createDecorations(
	// 	state: Readonly<EditorState<Schema<string, string>>>
	// ): DecorationSet<any> {
	// 	DecorationSet.create()
	// }

	@command({ icon: 'listOrdered' })
	toggleOrderedList(): CommandFunction {
		let listType = this.type;
		let itemType = assertGet(this.store.schema.nodes, 'listItem');
		return (props) => {
			const { dispatch, tr } = props;
			const state = chainableEditorState(tr, props.state);
			const { $from, $to } = tr.selection;
			const range = $from.blockRange($to);
			if (!range) {
				return false;
			}

			const parentList = findParentNode({
				predicate: (node) => isList(node.type),
				selection: tr.selection,
			});

			if (
				// the selection range is right inside the list
				parentList &&
				range.depth - parentList.depth <= 1 &&
				// the selectron range is the first child of the list
				range.startIndex === 0
			) {
				if (parentList.node.type === listType) {
					return liftListItemOutOfList(itemType)(props);
				}

				if (isList(parentList.node.type)) {
					if (listType.validContent(parentList.node.content)) {
						dispatch?.(tr.setNodeMarkup(parentList.pos, listType));
						return true;
					}

					// When you try to toggle a bullet list into a task list or vice versa, since these two lists
					// use different type of list items, you can't directly change the list type.
					if (
						deepChangeListType(tr, parentList, listType, itemType)
					) {
						dispatch?.(tr.scrollIntoView());
						return true;
					}

					return false;
				}
			}

			return wrapInList(listType)(state, dispatch);
		};
	}

	/**
	 * I'm looping through the doc to find the OrderedList node directly above the current node.
	 *
	 * We can get its order and increment the current nodes order by 1.
	 *
	 * After this, since a new list has been inserted to the doc, all the subsequent ordered lists
	 * must be updated as well. For this I'm continuing the loop after finding the prevListNode,
	 * and changing their order attribute as well. I'm doing this through transforms and steps and not
	 * mutating the state directly as recommended in the prosemirror docs. The state gets updated correctly
	 * but its not reflected in the dom.
	 * This https://discuss.prosemirror.net/t/custom-nodes-todom-not-updating-the-nodes-related-dom-element-attribute/3573 suggests
	 * to use nodeViews, but I'm not sure how to do that.
	 */
	// @ts-ignore
	@command()
	toggleContinueOrderList(): CommandFunction {
		return (
			props: CommandFunctionProps<Schema<string, string>> & object
		) => {
			const { tr, dispatch, state } = props;
			// const s = chainableEditorState(tr, props.state);
			// const newTR = s.tr;
			const { $from, $to } = tr.selection;
			const range = $from.blockRange($to);

			if (!range) {
				return false;
			}

			/**
			 *  the order to start from in the ordered list. in html, this would be the start attribute.
			 */
			let order = 0;

			// content field contains the all the child nodes in the doc
			// @ts-ignore
			const content = tr.doc.content.content;
			/**
			 * Keep track of the position when we are traversing the nodes.
			 */
			let positionOffset = 0;

			/**
			 * holds the ordered list that is directly above the current node.
			 */
			let latestOrderedList: any = null;
			let i = 0;
			for (i = 0; i <= content.length - 1; i++) {
				const node = content[i];
				let nodeSize = node.nodeSize;
				if (node.type.name === 'orderedList') {
					latestOrderedList = node;
				}
				if (positionOffset + nodeSize >= range.$from.pos) {
					// found the node. break out of the loop
					positionOffset += nodeSize;
					break;
				} else {
					positionOffset += nodeSize;
				}
			}

			const parentNode = findParentNode({
				predicate: (node) => node.type === latestOrderedList.type,
				selection: tr.selection,
			});

			if (parentNode?.node.sameMarkup(latestOrderedList)) {
				return false;
			}

			if (latestOrderedList && latestOrderedList.attrs.order) {
				for (let j = i; j <= content.length - 1; j++) {
					const node = content[j];
					if (node.type.name === 'orderedList') {
						try {
							// TODO: temp code. Shouldnt need this function, too many loops. We can keep track
							// of start and end variables here, updating it as we move through the loop
							const positions = this.getNodePositions(
								node,
								tr.doc
							);
							// console.log('CURRENT NODE :', node);
							const text = tr.doc.type.schema.text(' abcdc');
							// console.log('TEXTNODE : ', text);
							// @ts-ignore
							const newNode = node.content.append(text.content);
							// console.log('NWENODE : ', newNode);
							node.content.append(text.content);
							// node.type.schema.text(' abcdefg');
							// console.log('nodee : ', node);
							// node.content.content.push(newNode);

							node.content.append(Fragment.from([text]));
							// node.attrs.order += 1;
							// node.type.spec.attrs.order += 1;
							tr.setNodeMarkup(positions.start, undefined, {
								order: node.attrs.order + 1,
							});
							// console.log('rrr : ', tr);
							// tr.replaceWith(
							// 	positions.start,
							// 	positions.end,
							// 	node
							// );
						} catch (e) {
							console.dir(e);
						}
					}
					positionOffset += node.nodeSize;
				}
				order =
					latestOrderedList.attrs.order +
					latestOrderedList.content.content.length -
					1;
			}
			dispatch!(tr);

			let newState = state.apply(tr);
			// props.view?.dispatch(tr);
			// dispatch!(tr);

			// console.log('new state : ', newState);
			// @ts-ignore
			wrapInList(this.type, { order: order + 1 })(newState, dispatch);

			return true;
		};
	}

	// createKeymap(): KeyBindings {
	// 	const pcKeymap = {
	// 		Tab: (params: any) => {
	// 			// console.log('this ran in side the tab callback');

	// 			return indentListCommand(params);
	// 		},
	// 		Shift: (params: any) => {
	// 			// console.log('in the shift callback');
	// 			return dedentListCommand(params);
	// 		},
	// 		// Backspace: listBackspace,
	// 		// 'Mod-Backspace': listBackspace,
	// 	};

	// 	// if (environment.isMac) {
	// 	// 	const macKeymap = {
	// 	// 		'Ctrl-h': pcKeymap['Backspace'],
	// 	// 		'Alt-Backspace': pcKeymap['Mod-Backspace'],
	// 	// 	};
	// 	// 	return { ...pcKeymap, ...macKeymap };
	// 	// }

	// 	// @ts-ignore
	// 	return pcKeymap;
	// }

	createInputRules(): InputRule[] {
		const regexp = /^(\d+)\.\s$/;
		// console.log('inside the input rules');
		return [
			wrappingInputRule(
				regexp,
				// @ts-ignore
				this.type,
				(match) => ({ order: +assertGet(match, 1) }),
				(match, node) => {
					// console.log('inside the this rules');

					return (
						node.childCount + (node.attrs.order as number) ===
						+assertGet(match, 1)
					);
				}
			),

			// @ts-ignore
			new InputRule(regexp, (state, match, start, end) => {
				const tr = state.tr;
				// console.log('inside the that rules');

				tr.deleteRange(start, end);
				const canUpdate = wrapSelectedItems({
					// @ts-ignore
					listType: this.type,
					// @ts-ignore
					itemType: assertGet(this.store.schema.nodes, 'listItem'),
					tr,
				});

				if (!canUpdate) {
					return null;
				}

				const order = +assertGet(match, 1);

				if (order !== 1) {
					const found = findParentNodeOfType({
						selection: tr.selection,
						// @ts-ignore
						types: this.type,
					});

					if (found) {
						tr.setNodeMarkup(found.pos, undefined, { order });
					}
				}

				return tr;
			}),
		];
	}
}
