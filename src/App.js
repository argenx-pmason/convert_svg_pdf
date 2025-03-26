import React, { useEffect, useState, useRef } from "react";
import { jsPDF } from "jspdf";
import { Button, Box, TextField, Tooltip } from "@mui/material";
import { DataGridPro } from "@mui/x-data-grid-pro";
import { LicenseInfo } from "@mui/x-license";
import "svg2pdf.js";
import { logon, getChildren, getFileContents, upload } from "./utility";
LicenseInfo.setLicenseKey(
  "6b1cacb920025860cc06bcaf75ee7a66Tz05NDY2MixFPTE3NTMyNTMxMDQwMDAsUz1wcm8sTE09c3Vic2NyaXB0aW9uLEtWPTI="
);
// /clinical/argx-117/mmn/argx-117-2002/biostat/staging/final_r_figures/output/images/svg
// http://localhost:3000/lsaf/webdav/repo/general/biostat/apps/convert_svg_pdf?in=/clinical/argx-117/mmn/argx-117-2002/biostat/staging/final_r_figures/output/images/svg&out=/clinical/argx-117/mmn/argx-117-2002/biostat/staging/final_r_figures/output/images/pdf2

const SvgToPdfConverter = () => {
  const [svgData, setSvgData] = useState(""),
    [innerWidth, setInnerWidth] = useState(0),
    [innerHeight, setInnerHeight] = useState(0),
    [svgFolder, setSvgFolder] = useState(""),
    [pdfFolder, setPdfFolder] = useState(""),
    [message, setMessage] = useState(null),
    { host, href } = window.location,
    [username, setUsername] = useState(""),
    // [password, setPassword] = useState(""),
    [token, setToken] = useState(undefined),
    [svgStatus, setSvgStatus] = useState(""),
    tableRef = useRef(),
    [encryptedPassword, setEncryptedPassword] = useState(""),
    mode = href.startsWith("http://localhost") ? "local" : "remote";
  let _realhost;
  if (host.includes("sharepoint")) {
    _realhost = "xarprod.ondemand.sas.com";
  } else if (host.includes("localhost")) {
    _realhost = "xarval.ondemand.sas.com";
  } else {
    _realhost = host;
  }
  const api = "https://" + _realhost + "/lsaf/api",
    lsaf = "https://" + _realhost + "/lsaf",
    webDavPrefix = lsaf + "/webdav/repo",
    fileViewerPrefix =
      webDavPrefix + `/general/biostat/apps/fileviewer/index.html?file=`,
    // Handle file upload
    // handleFileUpload = (event) => {
    //   const file = event.target.files[0];
    //   if (file && file.type === "image/svg+xml") {
    //     const reader = new FileReader();
    //     reader.onload = (e) => setSvgData(e.target.result);
    //     reader.readAsText(file);
    //   } else {
    //     alert("Please upload a valid SVG file.");
    //   }
    // },
    // Convert SVG to PDF
    convertToPdf = async (svgData, path) => {
      if (!svgData) {
        alert("No SVG uploaded!");
        return;
      }

      const filename = path.split("/").pop().split(".")[0],
        parser = new DOMParser(),
        svgElement = parser.parseFromString(
          svgData,
          "image/svg+xml"
        ).documentElement,
        pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: "a4",
        });

      await pdf.svg(svgElement, { x: 10, y: 10, width: 277, height: 190 }); // a4 = 210 x 297 mm
      // await pdf.addSvgAsImage(svgData, 1, 1, 28, 19, '', "SLOW", 0); // a4 = 297 x 210  mm

      pdf.setProperties({
        title: "My Title",
        subject: "This is the subject",
        author: "Phil Mason",
        keywords: "study, research, pdf, javascript",
        creator: "PM",
      });

      // pdf.save(filename + ".pdf"); // save via browser

      const datauristring = pdf.output("datauristring"),
        blob = await (await fetch(datauristring)).blob();
      console.log(
        "filename",
        filename,
        "Blob",
        blob,
        "datauristring",
        datauristring
      );

      const response = await upload(
        api,
        pdfFolder + "/" + filename + ".pdf",
        blob,
        token,
        true,
        "uploaded from convert_svg_pdf",
        "MINOR"
      );
      console.log("response from upload: ", response);
      return response;
    },
    [svgList, setSvgList] = useState([]),
    svgCols = [
      { field: "path", headerName: "Path to SVG", width: 900 },
      { field: "status", headerName: "Status", width: 200 },
    ],
    load = async () => {
      console.log("load", svgFolder, pdfFolder);
      const svgFolderUrl = webDavPrefix + svgFolder,
        pdfFolderUrl = webDavPrefix + pdfFolder;
      const svgFolderChildren = await getChildren(
        api,
        token,
        svgFolder,
        setSvgStatus
      );
      console.log(
        "svgFolderUrl",
        svgFolderUrl,
        "pdfFolderUrl",
        pdfFolderUrl,
        "svgFolderChildren",
        svgFolderChildren,
        "svgStatus",
        svgStatus
      );
      setSvgList(
        svgFolderChildren.items.map((item, id) => ({ id: id, path: item.path }))
      );
    },
    [pdfStatus, setPdfStatus] = useState(""),
    handleRemovePdfs = async () => {
      const pdfFolderChildren = await getChildren(
        api,
        token,
        pdfFolder,
        setPdfStatus
      );
      const pdfs = pdfFolderChildren.items
        .filter((item) => item.path.includes(".pdf"))
        .map((item) => item.path);
      console.log("handleRemovePdfs", pdfFolder, pdfs);
    },
    [start, setStart] = useState(false),
    handleConvert = () => {
      const selectedRows = tableRef.current.getSelectedRows(),
        convertingRows = [];
      console.log("handleConvert", tableRef, selectedRows);
      selectedRows.forEach((row) => {
        console.log("Converting", row.path);
        convertingRows.push(row);
      });
      setSvgList(convertingRows.map((r) => ({ ...r, status: "Ready" })));
      setStart(true);
      let stateObj = { id: "100" };
      window.history.replaceState(
        stateObj,
        "unused",
        `/lsaf/filedownload/sdd%3A///general/biostat/apps/convert_svg_pdf/index.html?in=${svgFolder}&out=${pdfFolder}`
      );
    };

  //convert the SVGs to PDFs
  useEffect(() => {
    if (!start) return;
    console.log("Convert SVGs", svgList);
    const runJobs = async () => {
      for (const row of svgList) {
        row.status = "starting";
        setSvgList((prev) => [...svgList]);
        console.log("Convert SVG", "row.path", row.path);
        const tempSvg = await getFileContents(api, token, row.path);
        // console.log("response from getFileContents: ", tempSvg);
        row.status = "converting";
        setSvgList((prev) => [...svgList]);
        const uploadStatus = await convertToPdf(tempSvg, row.path);
        console.log("uploadStatus", uploadStatus);
        row.status = uploadStatus;
        setSvgList((prev) => [...svgList]);
      }
    };
    runJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

  useEffect(() => {
    const queryParameters = new URLSearchParams(window.location.search),
      tempUsername = localStorage.getItem("username"),
      _in = queryParameters.get("in") ? queryParameters.get("in") : null,
      _out = queryParameters.get("out")
        ? queryParameters.get("out")
        : `/Users/${tempUsername}/output`;
    console.log(queryParameters, _in, _out);
    setSvgFolder(_in);
    setPdfFolder(_out);
    setInnerHeight(window.innerHeight);
    setInnerWidth(window.innerWidth);
  }, []);

  useEffect(() => {
    if (mode === "local") return;
    if (api === null || api === undefined) return;
    // logon if we have the info needed to do it successfully
    // if it fails, then token is set to null which will trigger opening encrypt app
    const tempUsername = localStorage.getItem("username"),
      tempEncryptedPassword = localStorage.getItem("encryptedPassword");
    setUsername(tempUsername);
    setEncryptedPassword(tempEncryptedPassword);
    console.log(
      "api",
      api,
      "tempUsername",
      tempUsername,
      "tempEncryptedPassword",
      tempEncryptedPassword
    );
    logon(api, tempUsername, tempEncryptedPassword, setToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  // if encrypting password failed, then open the encrypt app before continuing
  useEffect(() => {
    if (mode === "local") return;
    // default value for token is undefined, if logon is attempted and fails then it is set to null
    if (token === null) {
      setMessage(
        "😲 Logon failed - please re-enter your username & password and then return to this page to refresh it. 👍"
      );
      setTimeout(() => {
        window
          .open(
            "https://" +
              host +
              "/lsaf/webdav/" +
              "repo" +
              "/general/biostat/apps/encrypt/index.html?app=convert_svg_pdf"
          )
          .focus();
      }, 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h2>SVG to PDF Converter</h2>
      {message && (
        <Box sx={{ backgroundColor: "yellow", fontSize: "20" }}>{message}</Box>
      )}
      {/* <input type="file" accept=".svg" onChange={handleFileUpload} />
      <br />
      <br />
      {svgData && (
        <div
          dangerouslySetInnerHTML={{ __html: svgData }}
          style={{ border: "1px solid #ddd", padding: "10px" }}
        />
      )}
      <br />
      <Button
        variant="contained"
        color="primary"
        onClick={convertToPdf}
        disabled={!svgData}
      >
        Convert selected file to PDF
      </Button>
      <p />
      <hr /> */}
      <p />
      <TextField
        label="SVG Folder"
        size="small"
        sx={{ m: 1, width: 600 }}
        InputLabelProps={{ shrink: true, style: { fontSize: 12 } }}
        InputProps={{ style: { fontSize: 10 } }}
        value={svgFolder}
        onChange={(e) => setSvgFolder(e.target.value)}
      />
      <TextField
        label="PDF Folder"
        size="small"
        sx={{ m: 1, width: 600 }}
        InputLabelProps={{ shrink: true, style: { fontSize: 12 } }}
        InputProps={{ style: { fontSize: 10 } }}
        value={pdfFolder}
        onChange={(e) => setPdfFolder(e.target.value)}
      />
      <br />
      <Button
        variant="contained"
        color="warning"
        size="small"
        onClick={() => load()}
        disabled={!svgFolder}
      >
        Get SVG names
      </Button>

      {svgStatus ? (
        <span> &nbsp;Status returned: {svgStatus} &nbsp;</span>
      ) : null}
      <Tooltip title="Load SVG paths from the SVG folder">
        <Button
          variant="contained"
          color="info"
          size="small"
          sx={{ ml: 2 }}
          onClick={() => {
            setSvgList(
              svgList.filter((item) => item.path.includes("-cropped") === false)
            );
          }}
          disabled={svgList.length === 0}
        >
          Hide cropped SVGs
        </Button>
      </Tooltip>
      <Tooltip title="Download each SVG, convert it to a PDF, and upload it to the PDF folder">
        <Button
          sx={{ ml: 2 }}
          variant="contained"
          color="success"
          size="small"
          onClick={() => handleConvert()}
          disabled={!svgFolder || !pdfFolder}
        >
          Convert SVGs to PDFs
        </Button>
      </Tooltip>
      <Tooltip title="View the contents of the PDF folder using the File Viewer app">
        <Button
          sx={{ ml: 2 }}
          variant="contained"
          color="secondary"
          size="small"
          onClick={() => window.open(fileViewerPrefix + pdfFolder, "_blank")}
          disabled={!svgFolder || !pdfFolder}
        >
          View PDFs
        </Button>
      </Tooltip>
      <Tooltip title="Remove PDFs from the PDF folder">
        <Button
          sx={{ ml: 2, backgroundColor: "red" }}
          variant="contained"
          size="small"
          onClick={() => handleRemovePdfs()}
          disabled={!svgFolder || !pdfFolder}
        >
          Remove PDFs
        </Button>
      </Tooltip>

      <Box sx={{ height: innerHeight - 200, width: innerWidth - 140 }}>
        <DataGridPro
          apiRef={tableRef}
          getRowHeight={() => 30}
          density="compact"
          sx={{ mt: 2, fontWeight: "fontSize=6", fontSize: "0.9em" }}
          rows={svgList}
          columns={svgCols}
          checkboxSelection
          disableSelectionOnClick
        />
      </Box>
    </div>
  );
};

export default SvgToPdfConverter;
