import DiamondNodeModel from '../diagram/diagram_node_declarations/DiamondNode/DiamondNodeModel';
import NodeParser from './NodeParser';

export default class BuildParser {
  constructor(onVariablesChange, updateBuildError = () => {}) {
    this.updateBuildError = updateBuildError;
    this.nodeParser = new NodeParser(updateBuildError);
    this.reset({}, {});
    this.onVariablesChange = onVariablesChange;
    this.indentation = '    ';
  }

  reset(
    varList,
    functionParams,
    eventList = null,
    structList = null,
    settings = {
      bitsMode: false,
      indentation: '    '
    }
  ) {
    this.nodeParser.reset(
      varList,
      functionParams,
      eventList,
      structList,
      settings.bitsMode
    );
    this.indentation = settings.indentation;
    if (this.updateBuildError) {
      this.updateBuildError('');
    }
  }

  getReturnVar() {
    return this.nodeParser.returnVar;
  }

  getView() {
    return this.nodeParser.isView;
  }

  parse(start) {
    this.findVariables(start);
    const code = this.traverseNextNode(start, 1);
    const variables = {
      ...this.nodeParser.variables,
      ...this.nodeParser.varList
    };
    this.onVariablesChange(variables);
    return { code, variables };
  }

  findVariables(start) {
    const unparsedStatements = new Set();
    this.traverseForVariables(start, unparsedStatements, new Set());
    let hasChanged = false;
    do {
      for (const statement of unparsedStatements) {
        if (this.nodeParser.parseNodeForVariables(statement)) {
          hasChanged = true;
          unparsedStatements.delete(statement);
        }
      }
    } while (unparsedStatements.size > 0 && hasChanged);
  }

  traverseForVariables(node, unparsedStatements, visitedNodes) {
    if (!node || visitedNodes.has(node)) {
      return;
    }
    visitedNodes.add(node);
    if (node instanceof DiamondNodeModel) {
      this.nodeParser.parseNode(node.data);
      const falseNextNode = this.getNextNode(node.outPortFalse);
      const trueNextNode = this.getNextNode(node.outPortTrue);
      this.traverseForVariables(
        falseNextNode,
        unparsedStatements,
        visitedNodes
      );
      this.traverseForVariables(trueNextNode, unparsedStatements, visitedNodes);
      return;
    }
    if (
      node.name !== 'Start' &&
      !this.nodeParser.parseNodeForVariables(node.data)
    ) {
      unparsedStatements.add(node.data);
    }
    const nextNode = this.getNextNodeForDefaultNode(node);
    this.traverseForVariables(nextNode, unparsedStatements, visitedNodes);
  }

  traverseDiamondNode(node, indentationDepth, stopNode) {
    const falseNextNode = this.getNextNode(node.outPortFalse);
    const trueNextNode = this.getNextNode(node.outPortTrue);
    const conditionCode = this.nodeParser.parseNode(node.data, '');
    const indentation = this.indentation.repeat(indentationDepth);
    const trueWhileCode = this.generateCodeForCycle(
      node,
      indentationDepth + 1,
      true
    );
    if (trueWhileCode) {
      return `${indentation}while (${conditionCode}) {\n${trueWhileCode}${indentation}}\n${this.traverseNextNode(
        falseNextNode,
        indentationDepth,
        stopNode
      )}`;
    }
    const falseWhileCode = this.generateCodeForCycle(
      node,
      indentationDepth + 1,
      false
    );
    if (falseWhileCode) {
      return `${indentation}while (!(${conditionCode})) {\n${falseWhileCode}${indentation}}\n${this.traverseNextNode(
        trueNextNode,
        indentationDepth,
        stopNode
      )}`;
    }
    const intersection = this.getIntersection(trueNextNode, falseNextNode);
    if (intersection) {
      const elseCode = this.traverseNextNode(
        falseNextNode,
        indentationDepth + 1,
        intersection
      );
      return `${indentation}if (${conditionCode}) {\n${this.traverseNextNode(
        trueNextNode,
        indentationDepth + 1,
        intersection
      )}${indentation}}${
        elseCode !== '' ? ` else {\n${elseCode}${indentation}}` : ''
      }\n${this.traverseNextNode(intersection, indentationDepth, stopNode)}`;
    }
    const elseCode = this.traverseNextNode(
      falseNextNode,
      indentationDepth + 1,
      stopNode
    );
    return `${indentation}if (${conditionCode}) {\n${this.traverseNextNode(
      trueNextNode,
      indentationDepth + 1,
      stopNode
    )}${indentation}}${
      elseCode !== '' ? ` else {\n${elseCode}${indentation}}` : ''
    }\n`;
  }

  traverseNextNode(node, indentationDepth, stopNode = null) {
    if (!node || (stopNode && node === stopNode)) {
      return '';
    }
    if (node instanceof DiamondNodeModel) {
      return this.traverseDiamondNode(node, indentationDepth, stopNode);
    }
    const curNodeCode =
      node.name === 'Start'
        ? ''
        : `${this.nodeParser.parseNode(
            node.data,
            this.indentation.repeat(indentationDepth)
          )}\n`;
    const nextNode = this.getNextNodeForDefaultNode(node);
    if (!nextNode) {
      return curNodeCode;
    }
    return (
      curNodeCode + this.traverseNextNode(nextNode, indentationDepth, stopNode)
    );
  }

  generateCodeForCycle(start, indentationDepth, isTrue) {
    const outPort = isTrue ? start.outPortTrue : start.outPortFalse;
    const nodeParserMemoryVarsRollback = {
      ...this.nodeParser.memoryVarsDeclared
    };
    let node = this.getNextNode(outPort);
    let code = '';
    let cycleHasAssignment = false;
    while (node) {
      if (node === start) {
        if (this.updateBuildError && !cycleHasAssignment) {
          this.updateBuildError(
            'Warning - infinite loop detected! Loops should have at least 1 assignment node to update the terminating condition.'
          );
        }
        return code;
      }
      // unable to handle multiple diamond nodes in the same cycle
      if (node instanceof DiamondNodeModel) {
        this.nodeParser.memoryVarsDeclared = nodeParserMemoryVarsRollback;
        return null;
      }
      if (node.data.type === 'assignment') {
        cycleHasAssignment = true;
      }
      code += `${this.nodeParser.parseNode(
        node.data,
        this.indentation.repeat(indentationDepth)
      )}\n`;
      node = this.getNextNodeForDefaultNode(node);
    }
    this.nodeParser.memoryVarsDeclared = nodeParserMemoryVarsRollback;
    return null;
  }

  getNextNode(outPort) {
    const links = Object.values(outPort.getLinks());
    if (!links.length || !links[0].sourcePort || !links[0].targetPort) {
      return null;
    }

    return links[0].targetPort.in
      ? links[0].targetPort.getNode()
      : links[0].sourcePort.getNode();
  }

  getNextNodeForDefaultNode(node) {
    if (node instanceof DiamondNodeModel || node.getOutPorts().length === 0) {
      return null;
    }
    return this.getNextNode(node.getOutPorts()[0]);
  }

  getIntersection(nodeA, nodeB) {
    const lengthDifference = this.getCount(nodeA) - this.getCount(nodeB);
    if (lengthDifference > 0) {
      return this.getIntersectionNodeTraversal(lengthDifference, nodeA, nodeB);
    }
    return this.getIntersectionNodeTraversal(-lengthDifference, nodeB, nodeA);
  }

  getCount(node) {
    let currentNode = node;
    let count = 0;
    while (currentNode) {
      count += 1;
      currentNode = this.getNextNodeForDefaultNode(currentNode);
    }
    return count;
  }

  getIntersectionNodeTraversal(diff, nodeA, nodeB) {
    let longerNode = nodeA;
    let shorterNode = nodeB;
    for (let i = 0; i < diff; i += 1) {
      if (!longerNode) return null;
      longerNode = this.getNextNodeForDefaultNode(longerNode);
    }

    while (longerNode && shorterNode) {
      if (longerNode === shorterNode) return longerNode;
      longerNode = this.getNextNodeForDefaultNode(longerNode);
      shorterNode = this.getNextNodeForDefaultNode(shorterNode);
    }

    return null;
  }
}
