import xlsx from 'json-as-xlsx'

export class Excel {
  static export (data,name) {
    // console.log(data)
    const settings = {
      fileName: name, // Name of the resulting spreadsheet
      extraLength: 3, // A bigger number means that columns will be wider
      // writeMode: "writeFile", // The available parameters are 'WriteFile' and 'write'. This setting is optional. Useful in such cases https://docs.sheetjs.com/docs/solutions/output#example-remote-file
      writeOptions: {} // Style options from https://docs.sheetjs.com/docs/api/write-options
      // RTL: true, // Display the columns from right-to-left (the default value is false)
    }

    xlsx(data, settings) // Will download the excel file
  }
}
