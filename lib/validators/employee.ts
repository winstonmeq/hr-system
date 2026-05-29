import { employeeStatuses, type EmployeeStatus } from "@/models/Employee";

type InputRecord = Record<string, unknown>;

function isRecord(value: unknown): value is InputRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value: unknown): string | undefined {
  const valueString = readString(value);
  return valueString ? valueString : undefined;
}

function readDate(value: unknown): Date | undefined {
  const valueString = readString(value);

  if (!valueString) {
    return undefined;
  }

  const date = new Date(valueString);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function readBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === "yes";
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readStringArray(value: unknown): string[] {
  return readArray(value).map(readString).filter(Boolean);
}

function readStatus(value: unknown): EmployeeStatus {
  const status = readString(value);

  if (employeeStatuses.includes(status as EmployeeStatus)) {
    return status as EmployeeStatus;
  }

  return "active";
}

function readName(value: unknown, required = false) {
  const record = isRecord(value) ? value : {};

  const surname = readString(record.surname);
  const firstName = readString(record.firstName);
  const middleName = readOptionalString(record.middleName);
  const nameExtension = readOptionalString(record.nameExtension);

  if (required && !surname) {
    throw new Error("Surname is required.");
  }

  if (required && !firstName) {
    throw new Error("First name is required.");
  }

  return {
    surname,
    firstName,
    middleName,
    nameExtension,
  };
}

function readAddress(value: unknown) {
  const record = isRecord(value) ? value : {};

  return {
    houseBlockLotNo: readOptionalString(record.houseBlockLotNo),
    street: readOptionalString(record.street),
    subdivisionVillage: readOptionalString(record.subdivisionVillage),
    barangay: readOptionalString(record.barangay),
    cityMunicipality: readOptionalString(record.cityMunicipality),
    province: readOptionalString(record.province),
    zipCode: readOptionalString(record.zipCode),
  };
}

function readYesNoDetails(value: unknown) {
  const record = isRecord(value) ? value : {};

  return {
    answer: readBoolean(record.answer),
    details: readOptionalString(record.details),
  };
}

function readEducationList(value: unknown) {
  return readArray(value).map((item) => {
    const record = isRecord(item) ? item : {};

    return {
      level: readString(record.level) || "college",
      schoolName: readOptionalString(record.schoolName),
      degreeCourse: readOptionalString(record.degreeCourse),
      periodFrom: readOptionalString(record.periodFrom),
      periodTo: readOptionalString(record.periodTo),
      highestLevelUnitsEarned: readOptionalString(record.highestLevelUnitsEarned),
      yearGraduated: readOptionalString(record.yearGraduated),
      scholarshipAcademicHonors: readOptionalString(
        record.scholarshipAcademicHonors,
      ),
    };
  });
}

function readEligibilityList(value: unknown) {
  return readArray(value).map((item) => {
    const record = isRecord(item) ? item : {};

    return {
      careerService: readOptionalString(record.careerService),
      rating: readOptionalString(record.rating),
      examinationDate: readDate(record.examinationDate),
      examinationPlace: readOptionalString(record.examinationPlace),
      licenseNumber: readOptionalString(record.licenseNumber),
      licenseValidityDate: readDate(record.licenseValidityDate),
    };
  });
}

function readWorkExperienceList(value: unknown) {
  return readArray(value).map((item) => {
    const record = isRecord(item) ? item : {};

    return {
      fromDate: readDate(record.fromDate),
      toDate: readDate(record.toDate),
      positionTitle: readOptionalString(record.positionTitle),
      departmentAgencyOfficeCompany: readOptionalString(
        record.departmentAgencyOfficeCompany,
      ),
      monthlySalary: readOptionalString(record.monthlySalary),
      salaryGradeStep: readOptionalString(record.salaryGradeStep),
      statusOfAppointment: readOptionalString(record.statusOfAppointment),
      isGovernmentService: readBoolean(record.isGovernmentService),
      duties: readOptionalString(record.duties),
    };
  });
}

function readVoluntaryWorkList(value: unknown) {
  return readArray(value).map((item) => {
    const record = isRecord(item) ? item : {};

    return {
      organizationNameAddress: readOptionalString(
        record.organizationNameAddress,
      ),
      fromDate: readDate(record.fromDate),
      toDate: readDate(record.toDate),
      numberOfHours: readOptionalString(record.numberOfHours),
      positionNatureOfWork: readOptionalString(record.positionNatureOfWork),
    };
  });
}

function readTrainingList(value: unknown) {
  return readArray(value).map((item) => {
    const record = isRecord(item) ? item : {};

    return {
      title: readOptionalString(record.title),
      fromDate: readDate(record.fromDate),
      toDate: readDate(record.toDate),
      numberOfHours: readOptionalString(record.numberOfHours),
      typeOfLd: readOptionalString(record.typeOfLd),
      conductedBy: readOptionalString(record.conductedBy),
    };
  });
}

function readChildren(value: unknown) {
  return readArray(value).map((item) => {
    const record = isRecord(item) ? item : {};

    return {
      fullName: readOptionalString(record.fullName),
      birthDate: readDate(record.birthDate),
    };
  });
}

function readReferences(value: unknown) {
  return readArray(value).map((item) => {
    const record = isRecord(item) ? item : {};

    return {
      name: readOptionalString(record.name),
      address: readOptionalString(record.address),
      telephoneNumber: readOptionalString(record.telephoneNumber),
    };
  });
}

export function parseEmployeeInput(input: unknown) {
  if (!isRecord(input)) {
    throw new Error("Invalid request body.");
  }

  const employeeNumber = readString(input.employeeNumber);

  if (!employeeNumber) {
    throw new Error("Employee number is required.");
  }

  const personalInfo = isRecord(input.personalInfo) ? input.personalInfo : {};
  const familyBackground = isRecord(input.familyBackground)
    ? input.familyBackground
    : {};
  const otherInformation = isRecord(input.otherInformation)
    ? input.otherInformation
    : {};
  const governmentIssuedId = isRecord(input.governmentIssuedId)
    ? input.governmentIssuedId
    : {};
  const pdsMeta = isRecord(input.pdsMeta) ? input.pdsMeta : {};

  const personalName = isRecord(personalInfo.name) ? personalInfo.name : {};

  const surname = readString(personalName.surname);
  const firstName = readString(personalName.firstName);

  if (!surname) {
    throw new Error("Surname is required.");
  }

  if (!firstName) {
    throw new Error("First name is required.");
  }

  return {
    employeeNumber,
    status: readStatus(input.status),

    personalInfo: {
      name: readName(personalInfo.name, true),
      birthDate: readDate(personalInfo.birthDate),
      placeOfBirth: readOptionalString(personalInfo.placeOfBirth),
      sex: readString(personalInfo.sex),
      civilStatus: readString(personalInfo.civilStatus),
      civilStatusOther: readOptionalString(personalInfo.civilStatusOther),
      citizenship: readString(personalInfo.citizenship) || "filipino",
      dualCitizenshipType: readString(personalInfo.dualCitizenshipType),
      dualCitizenshipCountry: readOptionalString(
        personalInfo.dualCitizenshipCountry,
      ),
      heightM: readOptionalString(personalInfo.heightM),
      weightKg: readOptionalString(personalInfo.weightKg),
      bloodType: readOptionalString(personalInfo.bloodType),

      ids: {
        gsis: readOptionalString(isRecord(personalInfo.ids) ? personalInfo.ids.gsis : undefined),
        pagibig: readOptionalString(isRecord(personalInfo.ids) ? personalInfo.ids.pagibig : undefined),
        philhealth: readOptionalString(isRecord(personalInfo.ids) ? personalInfo.ids.philhealth : undefined),
        sss: readOptionalString(isRecord(personalInfo.ids) ? personalInfo.ids.sss : undefined),
        tin: readOptionalString(isRecord(personalInfo.ids) ? personalInfo.ids.tin : undefined),
        agencyEmployeeNumber: readOptionalString(
          isRecord(personalInfo.ids)
            ? personalInfo.ids.agencyEmployeeNumber
            : undefined,
        ),
      },

      residentialAddress: readAddress(personalInfo.residentialAddress),
      permanentAddress: readAddress(personalInfo.permanentAddress),

      contact: {
        telephoneNumber: readOptionalString(
          isRecord(personalInfo.contact)
            ? personalInfo.contact.telephoneNumber
            : undefined,
        ),
        mobileNumber: readOptionalString(
          isRecord(personalInfo.contact)
            ? personalInfo.contact.mobileNumber
            : undefined,
        ),
        emailAddress: readOptionalString(
          isRecord(personalInfo.contact)
            ? readString(personalInfo.contact.emailAddress).toLowerCase()
            : undefined,
        ),
      },
    },

    familyBackground: {
      spouse: {
        name: readName(
          isRecord(familyBackground.spouse)
            ? familyBackground.spouse.name
            : undefined,
        ),
        occupation: readOptionalString(
          isRecord(familyBackground.spouse)
            ? familyBackground.spouse.occupation
            : undefined,
        ),
        employerBusinessName: readOptionalString(
          isRecord(familyBackground.spouse)
            ? familyBackground.spouse.employerBusinessName
            : undefined,
        ),
        businessAddress: readOptionalString(
          isRecord(familyBackground.spouse)
            ? familyBackground.spouse.businessAddress
            : undefined,
        ),
        telephoneNumber: readOptionalString(
          isRecord(familyBackground.spouse)
            ? familyBackground.spouse.telephoneNumber
            : undefined,
        ),
      },

      father: {
        name: readName(
          isRecord(familyBackground.father)
            ? familyBackground.father.name
            : undefined,
        ),
      },

      mother: {
        maidenName: readName(
          isRecord(familyBackground.mother)
            ? familyBackground.mother.maidenName
            : undefined,
        ),
      },

      children: readChildren(familyBackground.children),
    },

    educationalBackground: readEducationList(input.educationalBackground),
    civilServiceEligibility: readEligibilityList(input.civilServiceEligibility),
    workExperience: readWorkExperienceList(input.workExperience),
    voluntaryWork: readVoluntaryWorkList(input.voluntaryWork),
    learningAndDevelopment: readTrainingList(input.learningAndDevelopment),

    otherInformation: {
      specialSkillsHobbies: readStringArray(
        otherInformation.specialSkillsHobbies,
      ),
      nonAcademicDistinctions: readStringArray(
        otherInformation.nonAcademicDistinctions,
      ),
      memberships: readStringArray(otherInformation.memberships),

      relatedThirdDegree: readYesNoDetails(otherInformation.relatedThirdDegree),
      relatedFourthDegree: readYesNoDetails(
        otherInformation.relatedFourthDegree,
      ),
      foundGuiltyAdministrative: readYesNoDetails(
        otherInformation.foundGuiltyAdministrative,
      ),
      criminallyCharged: readYesNoDetails(otherInformation.criminallyCharged),
      convictedCrime: readYesNoDetails(otherInformation.convictedCrime),
      separatedFromService: readYesNoDetails(
        otherInformation.separatedFromService,
      ),
      candidateLastElection: readYesNoDetails(
        otherInformation.candidateLastElection,
      ),
      resignedToCampaign: readYesNoDetails(otherInformation.resignedToCampaign),
      immigrantPermanentResident: readYesNoDetails(
        otherInformation.immigrantPermanentResident,
      ),
      indigenousGroup: readYesNoDetails(otherInformation.indigenousGroup),
      personWithDisability: readYesNoDetails(
        otherInformation.personWithDisability,
      ),
      soloParent: readYesNoDetails(otherInformation.soloParent),
    },

    references: readReferences(input.references),

    governmentIssuedId: {
      idType: readOptionalString(governmentIssuedId.idType),
      idNumber: readOptionalString(governmentIssuedId.idNumber),
      dateIssued: readDate(governmentIssuedId.dateIssued),
      placeIssued: readOptionalString(governmentIssuedId.placeIssued),
    },

    pdsMeta: {
      dateAccomplished: readDate(pdsMeta.dateAccomplished),
      rightThumbmarkUrl: readOptionalString(pdsMeta.rightThumbmarkUrl),
      photoUrl: readOptionalString(pdsMeta.photoUrl),
      signatureUrl: readOptionalString(pdsMeta.signatureUrl),
    },
  };
}

export function parseEmployeeStatusInput(input: unknown) {
  if (!isRecord(input)) {
    throw new Error("Invalid request body.");
  }

  const status = readString(input.status);

  if (!employeeStatuses.includes(status as EmployeeStatus)) {
    throw new Error("Invalid employee status.");
  }

  return {
    status: status as EmployeeStatus,
  };
}
