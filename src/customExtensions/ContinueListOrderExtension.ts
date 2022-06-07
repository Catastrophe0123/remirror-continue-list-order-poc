import {
	command,
	CommandFunction,
	ExtensionTag,
	NodeType,
	NodeView,
	NodeViewMethod,
	CommandFunctionProps,
} from '@remirror/core';
import { isEditorState, isSelection } from 'remirror';
import { wrapInList } from '@remirror/pm/schema-list';

import { OrderedListExtension } from 'remirror/extensions';
import { Node, Schema } from '@remirror/pm/model';

export class ContinueListOrderExtension extends OrderedListExtension {
	createNodeViews():
		| NodeViewMethod<NodeView<any>>
		| Record<string, NodeViewMethod<NodeView<any>>> {
		return (...props: any) => {
			return {
				update: (
					node: Node,
					decorations: any,
					innerDecorations: any
				) => {
					// TODO: broken code below.
					console.log(
						'this : ',
						this,
						node,
						decorations,
						innerDecorations
					);
					if (node.type.name === 'orderedList') {
						return false;
					}
					// if (node.type !== this.node.type) {
					// return false;
					// }

					// this.decorations = decorations;
					// this.node = node;
					return true;
				},
			};
		};
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
			const content = tr.doc.content.content as Fragment<
				Schema<string, string>
			>;

			/**
			 * Keep track of the position when we are traversing the nodes.
			 */
			let positionOffset = 0;
			/**
			 * holds the ordered list that is directly above the current node.
			 */
			let latestOrderedList = null;
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
							node.attrs.order += 1;
							node.type.spec.attrs.order += 1;
							tr.replaceWith(
								positions.start,
								positions.end,
								node
							);
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

			let newState = state.apply(tr);
			state.applyTransaction(tr);

			props.view?.updateState(newState);

			// props.view?.dispatch(tr);
			dispatch!(tr);

			console.log('new state : ', newState);
			wrapInList(this.type, { order: order + 1 })(newState, dispatch);

			return true;
		};
	}
}
