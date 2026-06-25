let fileHandle = null;

export const initFileHandle = async () => {
  try {
    fileHandle = await window.showSaveFilePicker({
      suggestedName: "positions_dataset.json",
      types: [
        {
          description: "JSON Files",
          accept: {
            "application/json": [".json"],
          },
        },
      ],
    });
  } catch (err) {
    console.log("파일 선택 취소");
  }
};

export const saveToFile = async (data: unknown) => {
  if (!fileHandle) return;
  try {
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
  } catch (err) {
    console.error("파일 저장 실패", err);
  }
};
