import React, { FunctionComponent, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { vmSlice, isExecuting } from "../JavascriptVM/vmSlice";
import { AppDispatch } from "../store";
import {
  BlocklyEvent,
  BlocklyUiEvent,
  BlocklyEventName,
  BlocklyInstance,
} from "./BlocklyInstance";
import {
  getHighlightedBlockId,
  getCurrentBlockSelection,
  isShowToolbox,
  blocklySlice,
} from "./blocklySlice";

import "./Blockly.css";
import { loadPredefinedDemo } from "./BlocklyProgramLoader";
import Blockly, { WorkspaceSvg } from "blockly";
import { getToolbox } from "./toolbox";

/**
 * Component that wraps the blockly interface.
 */
export const BlocklyEditor: FunctionComponent = () => {
  const workspaceAreaRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch<AppDispatch>();

  const highlightedBlock = useSelector(getHighlightedBlockId);
  const currentBlockSelection = useSelector(getCurrentBlockSelection);
  const showToolbox = useSelector(isShowToolbox);

  const executing = useSelector(isExecuting);

  const blocklyRef = useRef<BlocklyInstance | null>(null);

  function resizeBlocklyRegion() {
    // Compute the absolute coordinates and dimensions of wrapping area.
    if (!wrapperRef.current || !workspaceAreaRef.current) {
      return;
    }

    let element = wrapperRef.current;
    let x = 0;
    let y = 0;
    do {
      x += element.offsetLeft;
      y += element.offsetTop;
      element = element.offsetParent! as HTMLDivElement;
    } while (element);

    // Position blockly over wrapping area.
    const workspaceStyle = workspaceAreaRef.current.style;

    workspaceStyle.left = x + "px";
    workspaceStyle.top = y + "px";

    workspaceStyle.width = wrapperRef.current.offsetWidth + "px";
    workspaceStyle.height = wrapperRef.current.offsetHeight + "px";
  }

  // Initialize blockly and return destruction callback
  useEffect(() => {
    function handleBlocklyChange(event: BlocklyEvent) {
      if (!blocklyRef.current) {
        return;
      }

      dispatch(vmSlice.actions.setCode({ code: blocklyRef.current.getCode() }));
    }

    function handleBlocklyUiEvent(event: BlocklyEvent) {
      if (event instanceof BlocklyUiEvent) {
        if (!blocklyRef.current) {
          return;
        }

        if (event.element === "selected") {
          dispatch(
            blocklySlice.actions.selectedBlock({
              blockId: blocklyRef.current.selected || "",
            })
          );
        }
      }
    }

    resizeBlocklyRegion();

    if (!blocklyRef.current) {
      blocklyRef.current = new BlocklyInstance(workspaceAreaRef.current!);

      loadPredefinedDemo(0, Blockly.getMainWorkspace());

      blocklyRef.current.addChangeListener(
        BlocklyEventName.BlockMove,
        handleBlocklyChange
      );
      blocklyRef.current.addChangeListener(
        BlocklyEventName.BlockChange,
        handleBlocklyChange
      );

      blocklyRef.current.addChangeListener(
        BlocklyEventName.Ui,
        handleBlocklyUiEvent
      );
    }
  });

  // Listen on window resizes and redraw blockly
  useEffect(() => {
    function onResizeHandler() {
      resizeBlocklyRegion();

      blocklyRef.current?.resizeBlockly();
    }

    window.addEventListener("resize", onResizeHandler);

    return window.removeEventListener.bind(window, "resize", onResizeHandler);
  });

  useEffect(() => {
    if (blocklyRef.current) {
      if (highlightedBlock) {
        blocklyRef.current.highlightBlock(highlightedBlock);
      }

      blocklyRef.current.selected = currentBlockSelection;
    }
  }, [highlightedBlock, currentBlockSelection, executing]);

  // show/minimize the toolbox. Blockly does not allow the manipulation of the toolbox
  // in any way except updating the xml definition of it.
  useEffect(() => {
    if (blocklyRef.current) {
      const workspace = Blockly.getMainWorkspace() as WorkspaceSvg;
      // for an empty toolbox at least one category is needed
      const emptyToolboxXml = "<xml><category /></xml>";
      const blocklyXml = showToolbox ? getToolbox() : emptyToolboxXml;
      workspace.updateToolbox(blocklyXml);
      // extra call to refresh the workspace. Otherwise the workspace will not be
      // frefreshed based on the new width of the toolbox
      workspace.resize();
    }
  }, [showToolbox]);

  const onToolboxButtonClick = () =>
    dispatch(
      blocklySlice.actions.showToolbox({
        visible: !showToolbox,
      })
    );
  return (
    <div
      ref={wrapperRef}
      className={"blockly-workspace" + (executing ? " executing" : "")}
      title={
        executing ? "Your program cannot be changed until you stop it" : ""
      }
    >
      <img
        src={require("./ToolboxButton.png")}
        onClick={onToolboxButtonClick}
      />
      <div className="blockly-workspace-area" ref={workspaceAreaRef} />
    </div>
  );
};
