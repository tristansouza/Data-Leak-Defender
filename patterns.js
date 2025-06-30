// patterns.js

export const PATTERN_IDS = {
  SSN: /\b\d{3}-\d{2}-\d{4}\b/,
  PassportUS: /\b\d{9}\b/,
  InternationalBankAccount: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}\b/,
  CVV: /\b[0-9]{3,4}\b/,
  VIN: /\b[A-HJ-NPR-Z0-9]{17}\b/,
  DL_US: /\b[A-Z0-9]{1,15}\b/,
  HomeAddress: /\d{1,5}\s\w+(\s\w+)*\s(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)\b/i,
  GPSCoordinates: /\b\d{1,2}\.\d{5,},\s?-?\d{1,3}\.\d{5,}\b/,
  DateOfBirth: /\b\d{2}\/\d{2}\/\d{4}\b/,
  PlaceOfBirth: /\b(?:born in\s)([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/,
  EmploymentInfo: /\b(?:employed at|works at)\s[A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)*\b/
};
