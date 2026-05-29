import {
  Schema,
  model,
  models,
  type HydratedDocument,
  type InferSchemaType,
  type Model,
  type Types,
} from "mongoose";

export const employeeStatuses = [
  "active",
  "inactive",
  "retired",
  "separated",
] as const;

export type EmployeeStatus = (typeof employeeStatuses)[number];

const requiredNameSchema = new Schema(
  {
    surname: { type: String, required: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    nameExtension: { type: String, trim: true },
  },
  { _id: false },
);

const optionalNameSchema = new Schema(
  {
    surname: { type: String, trim: true },
    firstName: { type: String, trim: true },
    middleName: { type: String, trim: true },
    nameExtension: { type: String, trim: true },
  },
  { _id: false },
);


const addressSchema = new Schema(
  {
    houseBlockLotNo: { type: String, trim: true },
    street: { type: String, trim: true },
    subdivisionVillage: { type: String, trim: true },
    barangay: { type: String, trim: true },
    cityMunicipality: { type: String, trim: true },
    province: { type: String, trim: true },
    zipCode: { type: String, trim: true },
  },
  { _id: false },
);

const childSchema = new Schema(
  {
    fullName: { type: String, trim: true },
    birthDate: { type: Date },
  },
  { _id: false },
);

const educationSchema = new Schema(
  {
    level: {
      type: String,
      enum: ["elementary", "secondary", "vocational", "college", "graduate"],
      required: true,
    },
    schoolName: { type: String, trim: true },
    degreeCourse: { type: String, trim: true },
    periodFrom: { type: String, trim: true },
    periodTo: { type: String, trim: true },
    highestLevelUnitsEarned: { type: String, trim: true },
    yearGraduated: { type: String, trim: true },
    scholarshipAcademicHonors: { type: String, trim: true },
  },
  { _id: false },
);

const eligibilitySchema = new Schema(
  {
    careerService: { type: String, trim: true },
    rating: { type: String, trim: true },
    examinationDate: { type: Date },
    examinationPlace: { type: String, trim: true },
    licenseNumber: { type: String, trim: true },
    licenseValidityDate: { type: Date },
  },
  { _id: false },
);

const workExperienceSchema = new Schema(
  {
    fromDate: { type: Date },
    toDate: { type: Date },
    positionTitle: { type: String, trim: true },
    departmentAgencyOfficeCompany: { type: String, trim: true },
    monthlySalary: { type: String, trim: true },
    salaryGradeStep: { type: String, trim: true },
    statusOfAppointment: { type: String, trim: true },
    isGovernmentService: { type: Boolean, default: false },
    duties: { type: String, trim: true },
  },
  { _id: false },
);

const voluntaryWorkSchema = new Schema(
  {
    organizationNameAddress: { type: String, trim: true },
    fromDate: { type: Date },
    toDate: { type: Date },
    numberOfHours: { type: String, trim: true },
    positionNatureOfWork: { type: String, trim: true },
  },
  { _id: false },
);

const trainingSchema = new Schema(
  {
    title: { type: String, trim: true },
    fromDate: { type: Date },
    toDate: { type: Date },
    numberOfHours: { type: String, trim: true },
    typeOfLd: { type: String, trim: true },
    conductedBy: { type: String, trim: true },
  },
  { _id: false },
);

const referenceSchema = new Schema(
  {
    name: { type: String, trim: true },
    address: { type: String, trim: true },
    telephoneNumber: { type: String, trim: true },
  },
  { _id: false },
);

const yesNoDetailsSchema = new Schema(
  {
    answer: { type: Boolean, default: false },
    details: { type: String, trim: true },
  },
  { _id: false },
);

const employeeSchema = new Schema(
  {
    employeeNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },

    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    status: {
      type: String,
      enum: employeeStatuses,
      default: "active",
      index: true,
    },

    personalInfo: {
       name: { type: requiredNameSchema, required: true },

      birthDate: { type: Date },
      placeOfBirth: { type: String, trim: true },

      sex: {
        type: String,
        enum: ["male", "female", ""],
        default: "",
      },

      civilStatus: {
        type: String,
        enum: ["single", "married", "widowed", "separated", "other", ""],
        default: "",
      },

      civilStatusOther: { type: String, trim: true },

      citizenship: {
        type: String,
        enum: ["filipino", "dual_citizenship", ""],
        default: "filipino",
      },

      dualCitizenshipType: {
        type: String,
        enum: ["by_birth", "by_naturalization", ""],
        default: "",
      },

      dualCitizenshipCountry: { type: String, trim: true },

      heightM: { type: String, trim: true },
      weightKg: { type: String, trim: true },
      bloodType: { type: String, trim: true },

      ids: {
        gsis: { type: String, trim: true },
        pagibig: { type: String, trim: true },
        philhealth: { type: String, trim: true },
        sss: { type: String, trim: true },
        tin: { type: String, trim: true },
        agencyEmployeeNumber: { type: String, trim: true },
      },

      residentialAddress: addressSchema,
      permanentAddress: addressSchema,

      contact: {
        telephoneNumber: { type: String, trim: true },
        mobileNumber: { type: String, trim: true },
        emailAddress: { type: String, lowercase: true, trim: true },
      },
    },



    familyBackground: {
  spouse: {
    name: optionalNameSchema,
    occupation: { type: String, trim: true },
    employerBusinessName: { type: String, trim: true },
    businessAddress: { type: String, trim: true },
    telephoneNumber: { type: String, trim: true },
  },

  father: {
    name: optionalNameSchema,
  },

  mother: {
    maidenName: optionalNameSchema,
  },

  children: {
    type: [childSchema],
    default: [],
  },
},


    educationalBackground: {
      type: [educationSchema],
      default: [],
    },

    civilServiceEligibility: {
      type: [eligibilitySchema],
      default: [],
    },

    workExperience: {
      type: [workExperienceSchema],
      default: [],
    },

    voluntaryWork: {
      type: [voluntaryWorkSchema],
      default: [],
    },

    learningAndDevelopment: {
      type: [trainingSchema],
      default: [],
    },

    otherInformation: {
      specialSkillsHobbies: { type: [String], default: [] },
      nonAcademicDistinctions: { type: [String], default: [] },
      memberships: { type: [String], default: [] },

      relatedThirdDegree: yesNoDetailsSchema,
      relatedFourthDegree: yesNoDetailsSchema,
      foundGuiltyAdministrative: yesNoDetailsSchema,
      criminallyCharged: yesNoDetailsSchema,
      convictedCrime: yesNoDetailsSchema,
      separatedFromService: yesNoDetailsSchema,
      candidateLastElection: yesNoDetailsSchema,
      resignedToCampaign: yesNoDetailsSchema,
      immigrantPermanentResident: yesNoDetailsSchema,
      indigenousGroup: yesNoDetailsSchema,
      personWithDisability: yesNoDetailsSchema,
      soloParent: yesNoDetailsSchema,
    },

    references: {
      type: [referenceSchema],
      default: [],
    },

    governmentIssuedId: {
      idType: { type: String, trim: true },
      idNumber: { type: String, trim: true },
      dateIssued: { type: Date },
      placeIssued: { type: String, trim: true },
    },

    pdsMeta: {
      dateAccomplished: { type: Date },
      rightThumbmarkUrl: { type: String, trim: true },
      photoUrl: { type: String, trim: true },
      signatureUrl: { type: String, trim: true },
    },
  },
  {
    collection: "employees",
    timestamps: true,
  },
);

employeeSchema.index({
  "personalInfo.name.surname": 1,
  "personalInfo.name.firstName": 1,
});

employeeSchema.index({
  status: 1,
  employeeNumber: 1,
});

export type Employee = InferSchemaType<typeof employeeSchema> & {
  _id: Types.ObjectId;
};

export type EmployeeDocument = HydratedDocument<Employee>;

export const EmployeeModel =
  (models.Employee as Model<Employee> | undefined) ??
  model<Employee>("Employee", employeeSchema);