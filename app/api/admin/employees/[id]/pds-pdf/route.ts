import "@/models/Employee";

import fs from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";

import { requireApiPermission } from "@/lib/auth/api-guards";
import { permissions } from "@/lib/auth/permissions";
import { connectToDatabase } from "@/lib/db/mongoose";
import { EmployeeModel } from "@/models/Employee";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

type DrawTextOptions = {
  x: number;
  y: number;
  size?: number;
  maxWidth?: number;
  maxLines?: number;
  lineHeight?: number;
  uppercase?: boolean;
  font?: PDFFont;
};

type DrawRowOptions = {
  y: number;
  size?: number;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 936;

function sanitizePdfText(value: unknown) {
  return String(value ?? "")
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function valueAt(source: any, pathValue: string, fallback = "") {
  const value = pathValue
    .split(".")
    .reduce((current, key) => current?.[key], source);

  return sanitizePdfText(value || fallback);
}

function formatDate(value: unknown) {
  if (!value) return "";

  const date = value instanceof Date ? value : new Date(String(value));

  if (Number.isNaN(date.getTime())) return "";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());

  return `${day}/${month}/${year}`;
}

function formatYesNo(value: unknown) {
  return value ? "Y" : "N";
}

function fullNameFromPdsName(name: any) {
  return [
    sanitizePdfText(name?.surname),
    sanitizePdfText(name?.firstName),
    sanitizePdfText(name?.middleName),
    sanitizePdfText(name?.nameExtension),
  ]
    .filter(Boolean)
    .join(", ");
}

function buildAddress(address: any) {
  return [
    sanitizePdfText(address?.houseBlockLotNo),
    sanitizePdfText(address?.street),
    sanitizePdfText(address?.subdivisionVillage),
    sanitizePdfText(address?.barangay),
    sanitizePdfText(address?.cityMunicipality),
    sanitizePdfText(address?.province),
  ]
    .filter(Boolean)
    .join(", ");
}


function drawDebugGrid(page: PDFPage, font: PDFFont) {
  const { width, height } = page.getSize();

  for (let x = 0; x <= width; x += 25) {
    page.drawLine({
      start: { x, y: 0 },
      end: { x, y: height },
      thickness: x % 100 === 0 ? 0.6 : 0.25,
      color: rgb(1, 0, 0),
      opacity: x % 100 === 0 ? 0.45 : 0.2,
    });

    page.drawText(String(x), {
      x: x + 2,
      y: height - 12,
      size: 5,
      font,
      color: rgb(1, 0, 0),
    });
  }

  for (let y = 0; y <= height; y += 25) {
    page.drawLine({
      start: { x: 0, y },
      end: { x: width, y },
      thickness: y % 100 === 0 ? 0.6 : 0.25,
      color: rgb(0, 0, 1),
      opacity: y % 100 === 0 ? 0.45 : 0.2,
    });

    page.drawText(String(y), {
      x: 2,
      y: y + 2,
      size: 5,
      font,
      color: rgb(0, 0, 1),
    });
  }
}



function drawText(
  page: PDFPage,
  text: unknown,
  defaultFont: PDFFont,
  options: DrawTextOptions,
) {
  const font = options.font ?? defaultFont;
  const size = options.size ?? 7;
  const maxLines = options.maxLines ?? 1;
  const lineHeight = options.lineHeight ?? size + 2;

  let cleanText = sanitizePdfText(text);

  if (options.uppercase) {
    cleanText = cleanText.toUpperCase();
  }

  if (!cleanText) return;

  if (!options.maxWidth) {
    page.drawText(cleanText, {
      x: options.x,
      y: options.y,
      size,
      font,
      color: rgb(0, 0, 0),
    });

    return;
  }

  const words = cleanText.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    const candidateWidth = font.widthOfTextAtSize(candidate, size);

    if (candidateWidth <= options.maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;

    if (lines.length >= maxLines) {
      break;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  lines.slice(0, maxLines).forEach((line, index) => {
    page.drawText(line, {
      x: options.x,
      y: options.y - index * lineHeight,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  });
}

function drawCheck(page: PDFPage, checked: boolean, x: number, y: number) {
  if (!checked) return;

  page.drawText("X", {
    x,
    y,
    size: 7,
    color: rgb(0, 0, 0),
  });
}

function drawPage1(
  page: PDFPage,
  employee: any,
  font: PDFFont,
  boldFont: PDFFont,
) {
  const personalInfo = employee.personalInfo ?? {};
  const name = personalInfo.name ?? {};
  const ids = personalInfo.ids ?? {};
  const contact = personalInfo.contact ?? {};
  const family = employee.familyBackground ?? {};
  const spouse = family.spouse ?? {};
  const father = family.father ?? {};
  const mother = family.mother ?? {};

  drawText(page, name.surname, font, {
    x: 116,
    y: 807,
    size: 8,
    uppercase: true,
    maxWidth: 330,
  });

  drawText(page, name.firstName, font, {
    x: 116,
    y: 789,
    size: 8,
    uppercase: true,
    maxWidth: 300,
  });

  drawText(page, name.nameExtension, font, {
    x: 464,
    y: 789,
    size: 7,
    uppercase: true,
    maxWidth: 120,
  });

  drawText(page, name.middleName, font, {
    x: 116,
    y: 771,
    size: 8,
    uppercase: true,
    maxWidth: 330,
  });

  drawText(page, formatDate(personalInfo.birthDate), font, {
    x: 116,
    y: 745,
    size: 8,
    maxWidth: 130,
  });

  drawText(page, personalInfo.placeOfBirth, font, {
    x: 116,
    y: 705,
    size: 7,
    maxWidth: 130,
    maxLines: 2,
  });

  drawText(page, personalInfo.sex, font, {
    x: 116,
    y: 684,
    size: 8,
    uppercase: true,
    maxWidth: 120,
  });

  drawText(page, personalInfo.civilStatus, font, {
    x: 116,
    y: 663,
    size: 8,
    uppercase: true,
    maxWidth: 120,
  });

  drawText(page, personalInfo.heightM, font, {
    x: 116,
    y: 619,
    size: 8,
    maxWidth: 130,
  });

  drawText(page, personalInfo.weightKg, font, {
    x: 116,
    y: 600,
    size: 8,
    maxWidth: 130,
  });

  drawText(page, personalInfo.bloodType, font, {
    x: 116,
    y: 581,
    size: 8,
    uppercase: true,
    maxWidth: 130,
  });

  drawText(page, ids.gsis, font, {
    x: 116,
    y: 561,
    size: 7,
    maxWidth: 130,
  });

  drawText(page, ids.pagibig, font, {
    x: 116,
    y: 541,
    size: 7,
    maxWidth: 130,
  });

  drawText(page, ids.philhealth, font, {
    x: 116,
    y: 522,
    size: 7,
    maxWidth: 130,
  });

  drawText(page, ids.philsys ?? "", font, {
    x: 116,
    y: 502,
    size: 7,
    maxWidth: 130,
  });

  drawText(page, ids.tin, font, {
    x: 116,
    y: 483,
    size: 7,
    maxWidth: 130,
  });

  drawText(page, ids.agencyEmployeeNumber || employee.employeeNumber, font, {
    x: 116,
    y: 464,
    size: 7,
    maxWidth: 130,
  });

  drawText(page, personalInfo.citizenship, font, {
    x: 320,
    y: 742,
    size: 7,
    uppercase: true,
    maxWidth: 140,
  });

  drawText(page, personalInfo.dualCitizenshipCountry, font, {
    x: 460,
    y: 705,
    size: 7,
    uppercase: true,
    maxWidth: 120,
  });

  drawText(page, buildAddress(personalInfo.residentialAddress), font, {
    x: 350,
    y: 657,
    size: 6,
    maxWidth: 245,
    maxLines: 3,
    lineHeight: 8,
  });

  drawText(page, personalInfo.residentialAddress?.zipCode, font, {
    x: 305,
    y: 608,
    size: 7,
    maxWidth: 70,
  });

  drawText(page, buildAddress(personalInfo.permanentAddress), font, {
    x: 350,
    y: 582,
    size: 6,
    maxWidth: 245,
    maxLines: 3,
    lineHeight: 8,
  });

  drawText(page, personalInfo.permanentAddress?.zipCode, font, {
    x: 305,
    y: 532,
    size: 7,
    maxWidth: 70,
  });

  drawText(page, contact.telephoneNumber, font, {
    x: 350,
    y: 512,
    size: 7,
    maxWidth: 240,
  });

  drawText(page, contact.mobileNumber, font, {
    x: 350,
    y: 493,
    size: 7,
    maxWidth: 240,
  });

  drawText(page, contact.emailAddress, font, {
    x: 350,
    y: 473,
    size: 7,
    maxWidth: 240,
  });

  drawText(page, spouse.name?.surname, font, {
    x: 116,
    y: 428,
    size: 7,
    uppercase: true,
    maxWidth: 220,
  });

  drawText(page, spouse.name?.firstName, font, {
    x: 116,
    y: 410,
    size: 7,
    uppercase: true,
    maxWidth: 170,
  });

  drawText(page, spouse.name?.nameExtension, font, {
    x: 260,
    y: 410,
    size: 7,
    uppercase: true,
    maxWidth: 70,
  });

  drawText(page, spouse.name?.middleName, font, {
    x: 116,
    y: 392,
    size: 7,
    uppercase: true,
    maxWidth: 220,
  });

  drawText(page, spouse.occupation, font, {
    x: 116,
    y: 374,
    size: 7,
    maxWidth: 220,
  });

  drawText(page, spouse.employerBusinessName, font, {
    x: 116,
    y: 356,
    size: 7,
    maxWidth: 220,
  });

  drawText(page, spouse.businessAddress, font, {
    x: 116,
    y: 338,
    size: 7,
    maxWidth: 220,
  });

  drawText(page, spouse.telephoneNumber, font, {
    x: 116,
    y: 320,
    size: 7,
    maxWidth: 220,
  });

  const children = Array.isArray(family.children) ? family.children : [];
  children.slice(0, 8).forEach((child: any, index: number) => {
    const y = 428 - index * 18;

    drawText(page, child.fullName, font, {
      x: 350,
      y,
      size: 7,
      uppercase: true,
      maxWidth: 155,
    });

    drawText(page, formatDate(child.birthDate), font, {
      x: 520,
      y,
      size: 7,
      maxWidth: 70,
    });
  });

  drawText(page, father.name?.surname, font, {
    x: 116,
    y: 303,
    size: 7,
    uppercase: true,
    maxWidth: 220,
  });

  drawText(page, father.name?.firstName, font, {
    x: 116,
    y: 285,
    size: 7,
    uppercase: true,
    maxWidth: 170,
  });

  drawText(page, father.name?.nameExtension, font, {
    x: 260,
    y: 285,
    size: 7,
    uppercase: true,
    maxWidth: 70,
  });

  drawText(page, father.name?.middleName, font, {
    x: 116,
    y: 267,
    size: 7,
    uppercase: true,
    maxWidth: 220,
  });

  drawText(page, mother.maidenName?.surname, font, {
    x: 116,
    y: 232,
    size: 7,
    uppercase: true,
    maxWidth: 220,
  });

  drawText(page, mother.maidenName?.firstName, font, {
    x: 116,
    y: 214,
    size: 7,
    uppercase: true,
    maxWidth: 220,
  });

  drawText(page, mother.maidenName?.middleName, font, {
    x: 116,
    y: 196,
    size: 7,
    uppercase: true,
    maxWidth: 220,
  });

  const education = Array.isArray(employee.educationalBackground)
    ? employee.educationalBackground
    : [];

  const educationY: Record<string, number> = {
    elementary: 129,
    secondary: 107,
    vocational: 85,
    college: 63,
    graduate: 41,
  };

  education.forEach((row: any) => {
    const y = educationY[row.level] ?? 63;

    drawText(page, row.schoolName, font, {
      x: 120,
      y,
      size: 6,
      maxWidth: 130,
      maxLines: 2,
      lineHeight: 7,
    });

    drawText(page, row.degreeCourse, font, {
      x: 260,
      y,
      size: 6,
      maxWidth: 120,
      maxLines: 2,
      lineHeight: 7,
    });

    drawText(page, row.periodFrom, font, {
      x: 397,
      y,
      size: 6,
      maxWidth: 35,
    });

    drawText(page, row.periodTo, font, {
      x: 434,
      y,
      size: 6,
      maxWidth: 35,
    });

    drawText(page, row.highestLevelUnitsEarned, font, {
      x: 477,
      y,
      size: 6,
      maxWidth: 50,
    });

    drawText(page, row.yearGraduated, font, {
      x: 535,
      y,
      size: 6,
      maxWidth: 40,
    });

    drawText(page, row.scholarshipAcademicHonors, font, {
      x: 573,
      y,
      size: 5,
      maxWidth: 35,
      maxLines: 2,
    });
  });

  drawText(page, formatDate(employee.pdsMeta?.dateAccomplished), boldFont, {
    x: 410,
    y: 17,
    size: 7,
    maxWidth: 80,
  });
}

function drawPage2(page: PDFPage, employee: any, font: PDFFont) {
  const eligibility = Array.isArray(employee.civilServiceEligibility)
    ? employee.civilServiceEligibility
    : [];

  eligibility.slice(0, 7).forEach((row: any, index: number) => {
    const y = 849 - index * 23;

    drawText(page, row.careerService, font, {
      x: 45,
      y,
      size: 6,
      maxWidth: 180,
      maxLines: 2,
      lineHeight: 7,
    });

    drawText(page, row.rating, font, {
      x: 240,
      y,
      size: 6,
      maxWidth: 45,
    });

    drawText(page, formatDate(row.examinationDate), font, {
      x: 305,
      y,
      size: 6,
      maxWidth: 60,
    });

    drawText(page, row.examinationPlace, font, {
      x: 380,
      y,
      size: 6,
      maxWidth: 80,
      maxLines: 2,
    });

    drawText(page, row.licenseNumber, font, {
      x: 470,
      y,
      size: 6,
      maxWidth: 45,
    });

    drawText(page, formatDate(row.licenseValidityDate), font, {
      x: 528,
      y,
      size: 6,
      maxWidth: 55,
    });
  });

  const workExperience = Array.isArray(employee.workExperience)
    ? employee.workExperience
    : [];

  workExperience.slice(0, 28).forEach((row: any, index: number) => {
    const y = 610 - index * 20.8;

    drawText(page, formatDate(row.fromDate), font, {
      x: 43,
      y,
      size: 5.5,
      maxWidth: 40,
    });

    drawText(page, formatDate(row.toDate), font, {
      x: 92,
      y,
      size: 5.5,
      maxWidth: 40,
    });

    drawText(page, row.positionTitle, font, {
      x: 145,
      y,
      size: 5.5,
      maxWidth: 145,
      maxLines: 2,
      lineHeight: 6,
    });

    drawText(page, row.departmentAgencyOfficeCompany, font, {
      x: 305,
      y,
      size: 5.5,
      maxWidth: 160,
      maxLines: 2,
      lineHeight: 6,
    });

    drawText(page, row.statusOfAppointment, font, {
      x: 480,
      y,
      size: 5.5,
      maxWidth: 55,
    });

    drawText(page, formatYesNo(row.isGovernmentService), font, {
      x: 550,
      y,
      size: 6,
      maxWidth: 20,
    });
  });

  drawText(page, formatDate(employee.pdsMeta?.dateAccomplished), font, {
    x: 420,
    y: 22,
    size: 7,
    maxWidth: 80,
  });
}

function drawPage3(page: PDFPage, employee: any, font: PDFFont) {
  const voluntaryWork = Array.isArray(employee.voluntaryWork)
    ? employee.voluntaryWork
    : [];

  voluntaryWork.slice(0, 7).forEach((row: any, index: number) => {
    const y = 846 - index * 21.8;

    drawText(page, row.organizationNameAddress, font, {
      x: 40,
      y,
      size: 5.8,
      maxWidth: 220,
      maxLines: 2,
      lineHeight: 6,
    });

    drawText(page, formatDate(row.fromDate), font, {
      x: 285,
      y,
      size: 5.5,
      maxWidth: 40,
    });

    drawText(page, formatDate(row.toDate), font, {
      x: 330,
      y,
      size: 5.5,
      maxWidth: 40,
    });

    drawText(page, row.numberOfHours, font, {
      x: 380,
      y,
      size: 5.5,
      maxWidth: 40,
    });

    drawText(page, row.positionNatureOfWork, font, {
      x: 430,
      y,
      size: 5.8,
      maxWidth: 165,
      maxLines: 2,
      lineHeight: 6,
    });
  });

  const trainings = Array.isArray(employee.learningAndDevelopment)
    ? employee.learningAndDevelopment
    : [];

  trainings.slice(0, 18).forEach((row: any, index: number) => {
    const y = 625 - index * 18.7;

    drawText(page, row.title, font, {
      x: 40,
      y,
      size: 5.5,
      maxWidth: 230,
      maxLines: 2,
      lineHeight: 6,
    });

    drawText(page, formatDate(row.fromDate), font, {
      x: 285,
      y,
      size: 5.5,
      maxWidth: 40,
    });

    drawText(page, formatDate(row.toDate), font, {
      x: 330,
      y,
      size: 5.5,
      maxWidth: 40,
    });

    drawText(page, row.numberOfHours, font, {
      x: 382,
      y,
      size: 5.5,
      maxWidth: 40,
    });

    drawText(page, row.typeOfLd, font, {
      x: 425,
      y,
      size: 5.5,
      maxWidth: 45,
    });

    drawText(page, row.conductedBy, font, {
      x: 475,
      y,
      size: 5.5,
      maxWidth: 110,
      maxLines: 2,
      lineHeight: 6,
    });
  });

  const otherInformation = employee.otherInformation ?? {};

  const skills = Array.isArray(otherInformation.specialSkillsHobbies)
    ? otherInformation.specialSkillsHobbies
    : [];

  const distinctions = Array.isArray(otherInformation.nonAcademicDistinctions)
    ? otherInformation.nonAcademicDistinctions
    : [];

  const memberships = Array.isArray(otherInformation.memberships)
    ? otherInformation.memberships
    : [];

  for (let index = 0; index < 7; index += 1) {
    const y = 185 - index * 20;

    drawText(page, skills[index], font, {
      x: 35,
      y,
      size: 6,
      maxWidth: 130,
    });

    drawText(page, distinctions[index], font, {
      x: 175,
      y,
      size: 6,
      maxWidth: 280,
    });

    drawText(page, memberships[index], font, {
      x: 470,
      y,
      size: 6,
      maxWidth: 120,
    });
  }

  drawText(page, formatDate(employee.pdsMeta?.dateAccomplished), font, {
    x: 420,
    y: 22,
    size: 7,
    maxWidth: 80,
  });
}

function drawQuestionAnswer(
  page: PDFPage,
  question: any,
  yesX: number,
  noX: number,
  y: number,
  detailX: number,
  detailY: number,
  font: PDFFont,
) {
  const answer = Boolean(question?.answer);

  drawCheck(page, answer, yesX, y);
  drawCheck(page, !answer, noX, y);

  drawText(page, question?.details, font, {
    x: detailX,
    y: detailY,
    size: 6,
    maxWidth: 185,
    maxLines: 2,
    lineHeight: 7,
  });
}

function drawPage4(page: PDFPage, employee: any, font: PDFFont) {
  const other = employee.otherInformation ?? {};

  drawQuestionAnswer(
    page,
    other.relatedThirdDegree,
    390,
    425,
    824,
    455,
    822,
    font,
  );

  drawQuestionAnswer(
    page,
    other.relatedFourthDegree,
    390,
    425,
    807,
    455,
    805,
    font,
  );

  drawQuestionAnswer(
    page,
    other.foundGuiltyAdministrative,
    390,
    425,
    735,
    455,
    733,
    font,
  );

  drawQuestionAnswer(
    page,
    other.criminallyCharged,
    390,
    425,
    680,
    455,
    678,
    font,
  );

  drawQuestionAnswer(
    page,
    other.convictedCrime,
    390,
    425,
    596,
    455,
    594,
    font,
  );

  drawQuestionAnswer(
    page,
    other.separatedFromService,
    390,
    425,
    520,
    455,
    518,
    font,
  );

  drawQuestionAnswer(
    page,
    other.candidateLastElection,
    390,
    425,
    474,
    455,
    472,
    font,
  );

  drawQuestionAnswer(
    page,
    other.resignedToCampaign,
    390,
    425,
    432,
    455,
    430,
    font,
  );

  drawQuestionAnswer(
    page,
    other.immigrantPermanentResident,
    390,
    425,
    389,
    455,
    387,
    font,
  );

  drawQuestionAnswer(
    page,
    other.indigenousGroup,
    390,
    425,
    305,
    455,
    303,
    font,
  );

  drawQuestionAnswer(
    page,
    other.personWithDisability,
    390,
    425,
    263,
    455,
    261,
    font,
  );

  drawQuestionAnswer(page, other.soloParent, 390, 425, 222, 455, 220, font);

  const references = Array.isArray(employee.references)
    ? employee.references
    : [];

  references.slice(0, 3).forEach((row: any, index: number) => {
    const y = 165 - index * 21;

    drawText(page, row.name, font, {
      x: 35,
      y,
      size: 6,
      maxWidth: 190,
      uppercase: true,
    });

    drawText(page, row.address, font, {
      x: 245,
      y,
      size: 6,
      maxWidth: 135,
      maxLines: 2,
      lineHeight: 7,
    });

    drawText(page, row.telephoneNumber || row.contact, font, {
      x: 390,
      y,
      size: 6,
      maxWidth: 70,
    });
  });

  const issuedId = employee.governmentIssuedId ?? {};

  drawText(page, issuedId.idType, font, {
    x: 22,
    y: 121,
    size: 6,
    maxWidth: 190,
  });

  drawText(page, issuedId.idNumber, font, {
    x: 22,
    y: 87,
    size: 6,
    maxWidth: 190,
  });

  const datePlaceIssued = [
    formatDate(issuedId.dateIssued),
    sanitizePdfText(issuedId.placeIssued),
  ]
    .filter(Boolean)
    .join(" / ");

  drawText(page, datePlaceIssued, font, {
    x: 22,
    y: 62,
    size: 6,
    maxWidth: 190,
  });

  drawText(page, formatDate(employee.pdsMeta?.dateAccomplished), font, {
    x: 365,
    y: 61,
    size: 7,
    maxWidth: 90,
  });
}

export async function GET(_request: NextRequest, context: RouteParams) {
  const auth = await requireApiPermission(permissions.employeesRead);

  if (!auth.ok) {
    return auth.response;
  }

  const { id } = await context.params;

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      { message: "Invalid employee ID." },
      { status: 400 },
    );
  }

  await connectToDatabase();

  const employee = await EmployeeModel.findById(id).lean();

  if (!employee) {
    return NextResponse.json(
      { message: "Employee was not found." },
      { status: 404 },
    );
  }

  const templatePath = path.join(
    process.cwd(),
    "public",
    "templates",
    "pds-2025.pdf",
  );

  let templateBytes: Uint8Array;

  try {
    templateBytes = await fs.readFile(templatePath);
  } catch {
    return NextResponse.json(
      {
        message:
          "PDS template was not found. Put the file at public/templates/pds-2025.pdf.",
      },
      { status: 500 },
    );
  }

  const pdfDocument = await PDFDocument.load(templateBytes);
  const font = await pdfDocument.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDocument.embedFont(StandardFonts.HelveticaBold);

  const pages = pdfDocument.getPages();

  const debug = new URL(_request.url).searchParams.get("debug") === "1";

  if (pages.length < 4) {
    return NextResponse.json(
      { message: "PDS template must have at least 4 pages." },
      { status: 500 },
    );
  }

  drawPage1(pages[0], employee, font, boldFont);
  drawPage2(pages[1], employee, font);
  drawPage3(pages[2], employee, font);
  drawPage4(pages[3], employee, font);

  if (debug) {
  pages.forEach((page) => drawDebugGrid(page, font));
}

  const pdfBytes = await pdfDocument.save();

  const employeeNumber = sanitizePdfText((employee as any).employeeNumber);
  const filename = employeeNumber
    ? `PDS-${employeeNumber}.pdf`
    : `PDS-${id}.pdf`;

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}