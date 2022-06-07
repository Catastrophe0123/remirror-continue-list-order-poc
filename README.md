# Remirror Continue List order

## Requirement

Provide a way to continue the list ordering of previous ordered list.
eg: 
``` 
1. hello
2. world
3. !!!

hello new paragraph here.
another paragraph

4. new list continuing the previous ordering
```

## The issue
```
1. hello
2. world
3. !!!

hello new paragraph here.
4. another paragraph // change this into new ordered list after creating 4.

4. new list continuing the previous ordering // Should update to 5. but doesnt :(
```

## What I'm doing
I'm looping through the doc to find the OrderedList node directly above the current node.

We can get its order and increment the current nodes order by 1.

After this, since a new list has been inserted to the doc, all the subsequent ordered lists
must be updated as well. For this I'm continuing the loop after finding the prevListNode,
and changing their order attribute. I'm doing this through transforms and steps and not
mutating the state directly as recommended in the prosemirror docs. The state gets updated correctly
but its not reflected in the dom.
This [comment](https://discuss.prosemirror.net/t/custom-nodes-todom-not-updating-the-nodes-related-dom-element-attribute/3573) suggests
to use nodeViews, but I'm not sure how to perform the update on a node that is not the currently selected node.
	 
