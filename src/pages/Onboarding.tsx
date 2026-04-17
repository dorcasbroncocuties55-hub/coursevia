import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { roleToDashboardPath } from "@/lib/authRoles";
import { buildBackendUrl } from "@/lib/backendApi";
import {
  Briefcase,
  Camera,
  CheckCircle2,
  Globe2,
  UploadCloud,
  Sparkles,
  ListChecks,
  GraduationCap,
  HeartHandshake,
  Video,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import ProfileAvatar from "@/components/shared/ProfileAvatar";
import { normalizeRole } from "@/lib/authRoles";
import { PROVIDER_CALENDAR_MODE_OPTIONS } from "@/lib/providerModes";
import { ScrollableContent } from "@/components/ui/scrollable-content";

type RoleOption = "learner" | "coach" | "creator" | "therapist";

type SpecializationConfig = {
  label: string;
  placeholder: string;
  options: string[];
};

const VALID_ROLE_OPTIONS: RoleOption[] = [
  "learner",
  "coach",
  "creator",
  "therapist",
];

const isRoleOption = (value: unknown): value is RoleOption => {
  return (
    typeof value === "string" &&
    VALID_ROLE_OPTIONS.includes(value as RoleOption)
  );
};

const safeRoleOption = (
  value: unknown,
  fallback: RoleOption = "learner"
): RoleOption => {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim().toLowerCase();
  return isRoleOption(cleaned) ? cleaned : fallback;
};

const roleOptions: {
  value: RoleOption;
  title: string;
  description: string;
}[] = [
  {
    value: "learner",
    title: "Learner",
    description:
      "Buy video courses, discover creators, and book sessions with coaches and therapists.",
  },
  {
    value: "coach",
    title: "Coach",
    description:
      "Offer coaching sessions, get discovered in the coach directory, and publish premium content.",
  },
  {
    value: "creator",
    title: "Creator",
    description:
      "Upload and sell premium video courses with categories that match your content niche.",
  },
  {
    value: "therapist",
    title: "Therapist",
    description:
      "Offer therapy sessions, appear in the therapist directory, and accept secure bookings.",
  },
];

const specializationConfig: Partial<Record<RoleOption, SpecializationConfig>> = {
  coach: {
    label: "What type of coach are you?",
    placeholder: "Choose coaching type",
    options: [
      "Life Coach",
      "Business Coach",
      "Career Coach",
      "Fitness Coach",
      "Relationship Coach",
      "Mindset Coach",
      "Executive Coach",
      "Leadership Coach",
      "Parenting Coach",
      "Other",
    ],
  },
  creator: {
    label: "What type of content do you create?",
    placeholder: "Choose creator niche",
    options: [
      "Business",
      "Education",
      "Finance",
      "Health",
      "Motivation",
      "Self Development",
      "Technology",
      "Spirituality",
      "Productivity",
      "Other",
    ],
  },
  therapist: {
    label: "What type of therapy do you offer?",
    placeholder: "Choose therapy type",
    options: [
      "Anxiety Therapy",
      "Cognitive Behavioral Therapy (CBT)",
      "Couples Therapy",
      "Depression Therapy",
      "Family Therapy",
      "Trauma Therapy",
      "Addiction Therapy",
      "Other",
    ],
  },
};

const learnerGoalOptions = [
  "Learn new skills",
  "Improve career",
  "Start a business",
  "Grow existing business",
  "Improve health and wellness",
  "Personal development",
  "Mental wellness support",
  "Financial knowledge",
  "Pass exams or certifications",
  "Other",
];

const COUNTRY_PHONE_CODE_OPTIONS = [
  { label: "Afghanistan (+93)", value: "+93" },
  { label: "Albania (+355)", value: "+355" },
  { label: "Algeria (+213)", value: "+213" },
  { label: "American Samoa (+1-684)", value: "+1684" },
  { label: "Andorra (+376)", value: "+376" },
  { label: "Angola (+244)", value: "+244" },
  { label: "Anguilla (+1-264)", value: "+1264" },
  { label: "Antigua and Barbuda (+1-268)", value: "+1268" },
  { label: "Argentina (+54)", value: "+54" },
  { label: "Armenia (+374)", value: "+374" },
  { label: "Aruba (+297)", value: "+297" },
  { label: "Australia (+61)", value: "+61" },
  { label: "Austria (+43)", value: "+43" },
  { label: "Azerbaijan (+994)", value: "+994" },
  { label: "Bahamas (+1-242)", value: "+1242" },
  { label: "Bahrain (+973)", value: "+973" },
  { label: "Bangladesh (+880)", value: "+880" },
  { label: "Barbados (+1-246)", value: "+1246" },
  { label: "Belarus (+375)", value: "+375" },
  { label: "Belgium (+32)", value: "+32" },
  { label: "Belize (+501)", value: "+501" },
  { label: "Benin (+229)", value: "+229" },
  { label: "Bermuda (+1-441)", value: "+1441" },
  { label: "Bhutan (+975)", value: "+975" },
  { label: "Bolivia (+591)", value: "+591" },
  { label: "Bosnia and Herzegovina (+387)", value: "+387" },
  { label: "Botswana (+267)", value: "+267" },
  { label: "Brazil (+55)", value: "+55" },
  { label: "British Virgin Islands (+1-284)", value: "+1284" },
  { label: "Brunei (+673)", value: "+673" },
  { label: "Bulgaria (+359)", value: "+359" },
  { label: "Burkina Faso (+226)", value: "+226" },
  { label: "Burundi (+257)", value: "+257" },
  { label: "Cabo Verde (+238)", value: "+238" },
  { label: "Cambodia (+855)", value: "+855" },
  { label: "Cameroon (+237)", value: "+237" },
  { label: "Canada (+1)", value: "+1" },
  { label: "Cayman Islands (+1-345)", value: "+1345" },
  { label: "Central African Republic (+236)", value: "+236" },
  { label: "Chad (+235)", value: "+235" },
  { label: "Chile (+56)", value: "+56" },
  { label: "China (+86)", value: "+86" },
  { label: "Colombia (+57)", value: "+57" },
  { label: "Comoros (+269)", value: "+269" },
  { label: "Congo (+242)", value: "+242" },
  { label: "Costa Rica (+506)", value: "+506" },
  { label: "Croatia (+385)", value: "+385" },
  { label: "Cuba (+53)", value: "+53" },
  { label: "Curacao (+599)", value: "+599" },
  { label: "Cyprus (+357)", value: "+357" },
  { label: "Czech Republic (+420)", value: "+420" },
  { label: "Democratic Republic of the Congo (+243)", value: "+243" },
  { label: "Denmark (+45)", value: "+45" },
  { label: "Djibouti (+253)", value: "+253" },
  { label: "Dominica (+1-767)", value: "+1767" },
  { label: "Dominican Republic (+1-809)", value: "+1809" },
  { label: "Ecuador (+593)", value: "+593" },
  { label: "Egypt (+20)", value: "+20" },
  { label: "El Salvador (+503)", value: "+503" },
  { label: "Equatorial Guinea (+240)", value: "+240" },
  { label: "Eritrea (+291)", value: "+291" },
  { label: "Estonia (+372)", value: "+372" },
  { label: "Eswatini (+268)", value: "+268" },
  { label: "Ethiopia (+251)", value: "+251" },
  { label: "Faroe Islands (+298)", value: "+298" },
  { label: "Fiji (+679)", value: "+679" },
  { label: "Finland (+358)", value: "+358" },
  { label: "France (+33)", value: "+33" },
  { label: "French Guiana (+594)", value: "+594" },
  { label: "French Polynesia (+689)", value: "+689" },
  { label: "Gabon (+241)", value: "+241" },
  { label: "Gambia (+220)", value: "+220" },
  { label: "Georgia (+995)", value: "+995" },
  { label: "Germany (+49)", value: "+49" },
  { label: "Ghana (+233)", value: "+233" },
  { label: "Gibraltar (+350)", value: "+350" },
  { label: "Greece (+30)", value: "+30" },
  { label: "Greenland (+299)", value: "+299" },
  { label: "Grenada (+1-473)", value: "+1473" },
  { label: "Guadeloupe (+590)", value: "+590" },
  { label: "Guam (+1-671)", value: "+1671" },
  { label: "Guatemala (+502)", value: "+502" },
  { label: "Guernsey (+44)", value: "+44" },
  { label: "Guinea (+224)", value: "+224" },
  { label: "Guinea-Bissau (+245)", value: "+245" },
  { label: "Guyana (+592)", value: "+592" },
  { label: "Haiti (+509)", value: "+509" },
  { label: "Honduras (+504)", value: "+504" },
  { label: "Hong Kong (+852)", value: "+852" },
  { label: "Hungary (+36)", value: "+36" },
  { label: "Iceland (+354)", value: "+354" },
  { label: "India (+91)", value: "+91" },
  { label: "Indonesia (+62)", value: "+62" },
  { label: "Iran (+98)", value: "+98" },
  { label: "Iraq (+964)", value: "+964" },
  { label: "Ireland (+353)", value: "+353" },
  { label: "Isle of Man (+44)", value: "+44" },
  { label: "Israel (+972)", value: "+972" },
  { label: "Italy (+39)", value: "+39" },
  { label: "Ivory Coast (+225)", value: "+225" },
  { label: "Jamaica (+1-876)", value: "+1876" },
  { label: "Japan (+81)", value: "+81" },
  { label: "Jersey (+44)", value: "+44" },
  { label: "Jordan (+962)", value: "+962" },
  { label: "Kazakhstan (+7)", value: "+7" },
  { label: "Kenya (+254)", value: "+254" },
  { label: "Kiribati (+686)", value: "+686" },
  { label: "Kosovo (+383)", value: "+383" },
  { label: "Kuwait (+965)", value: "+965" },
  { label: "Kyrgyzstan (+996)", value: "+996" },
  { label: "Laos (+856)", value: "+856" },
  { label: "Latvia (+371)", value: "+371" },
  { label: "Lebanon (+961)", value: "+961" },
  { label: "Lesotho (+266)", value: "+266" },
  { label: "Liberia (+231)", value: "+231" },
  { label: "Libya (+218)", value: "+218" },
  { label: "Liechtenstein (+423)", value: "+423" },
  { label: "Lithuania (+370)", value: "+370" },
  { label: "Luxembourg (+352)", value: "+352" },
  { label: "Macau (+853)", value: "+853" },
  { label: "Madagascar (+261)", value: "+261" },
  { label: "Malawi (+265)", value: "+265" },
  { label: "Malaysia (+60)", value: "+60" },
  { label: "Maldives (+960)", value: "+960" },
  { label: "Mali (+223)", value: "+223" },
  { label: "Malta (+356)", value: "+356" },
  { label: "Marshall Islands (+692)", value: "+692" },
  { label: "Martinique (+596)", value: "+596" },
  { label: "Mauritania (+222)", value: "+222" },
  { label: "Mauritius (+230)", value: "+230" },
  { label: "Mayotte (+262)", value: "+262" },
  { label: "Mexico (+52)", value: "+52" },
  { label: "Micronesia (+691)", value: "+691" },
  { label: "Moldova (+373)", value: "+373" },
  { label: "Monaco (+377)", value: "+377" },
  { label: "Mongolia (+976)", value: "+976" },
  { label: "Montenegro (+382)", value: "+382" },
  { label: "Montserrat (+1-664)", value: "+1664" },
  { label: "Morocco (+212)", value: "+212" },
  { label: "Mozambique (+258)", value: "+258" },
  { label: "Myanmar (+95)", value: "+95" },
  { label: "Namibia (+264)", value: "+264" },
  { label: "Nauru (+674)", value: "+674" },
  { label: "Nepal (+977)", value: "+977" },
  { label: "Netherlands (+31)", value: "+31" },
  { label: "New Caledonia (+687)", value: "+687" },
  { label: "New Zealand (+64)", value: "+64" },
  { label: "Nicaragua (+505)", value: "+505" },
  { label: "Niger (+227)", value: "+227" },
  { label: "Nigeria (+234)", value: "+234" },
  { label: "North Korea (+850)", value: "+850" },
  { label: "North Macedonia (+389)", value: "+389" },
  { label: "Norway (+47)", value: "+47" },
  { label: "Oman (+968)", value: "+968" },
  { label: "Pakistan (+92)", value: "+92" },
  { label: "Palau (+680)", value: "+680" },
  { label: "Palestine (+970)", value: "+970" },
  { label: "Panama (+507)", value: "+507" },
  { label: "Papua New Guinea (+675)", value: "+675" },
  { label: "Paraguay (+595)", value: "+595" },
  { label: "Peru (+51)", value: "+51" },
  { label: "Philippines (+63)", value: "+63" },
  { label: "Poland (+48)", value: "+48" },
  { label: "Portugal (+351)", value: "+351" },
  { label: "Puerto Rico (+1-787)", value: "+1787" },
  { label: "Qatar (+974)", value: "+974" },
  { label: "Reunion (+262)", value: "+262" },
  { label: "Romania (+40)", value: "+40" },
  { label: "Russia (+7)", value: "+7" },
  { label: "Rwanda (+250)", value: "+250" },
  { label: "Saint Kitts and Nevis (+1-869)", value: "+1869" },
  { label: "Saint Lucia (+1-758)", value: "+1758" },
  { label: "Saint Vincent and the Grenadines (+1-784)", value: "+1784" },
  { label: "Samoa (+685)", value: "+685" },
  { label: "San Marino (+378)", value: "+378" },
  { label: "Sao Tome and Principe (+239)", value: "+239" },
  { label: "Saudi Arabia (+966)", value: "+966" },
  { label: "Senegal (+221)", value: "+221" },
  { label: "Serbia (+381)", value: "+381" },
  { label: "Seychelles (+248)", value: "+248" },
  { label: "Sierra Leone (+232)", value: "+232" },
  { label: "Singapore (+65)", value: "+65" },
  { label: "Sint Maarten (+1-721)", value: "+1721" },
  { label: "Slovakia (+421)", value: "+421" },
  { label: "Slovenia (+386)", value: "+386" },
  { label: "Solomon Islands (+677)", value: "+677" },
  { label: "Somalia (+252)", value: "+252" },
  { label: "South Africa (+27)", value: "+27" },
  { label: "South Korea (+82)", value: "+82" },
  { label: "South Sudan (+211)", value: "+211" },
  { label: "Spain (+34)", value: "+34" },
  { label: "Sri Lanka (+94)", value: "+94" },
  { label: "Sudan (+249)", value: "+249" },
  { label: "Suriname (+597)", value: "+597" },
  { label: "Sweden (+46)", value: "+46" },
  { label: "Switzerland (+41)", value: "+41" },
  { label: "Syria (+963)", value: "+963" },
  { label: "Taiwan (+886)", value: "+886" },
  { label: "Tajikistan (+992)", value: "+992" },
  { label: "Tanzania (+255)", value: "+255" },
  { label: "Thailand (+66)", value: "+66" },
  { label: "Timor-Leste (+670)", value: "+670" },
  { label: "Togo (+228)", value: "+228" },
  { label: "Tonga (+676)", value: "+676" },
  { label: "Trinidad and Tobago (+1-868)", value: "+1868" },
  { label: "Tunisia (+216)", value: "+216" },
  { label: "Turkey (+90)", value: "+90" },
  { label: "Turkmenistan (+993)", value: "+993" },
  { label: "Turks and Caicos Islands (+1-649)", value: "+1649" },
  { label: "Tuvalu (+688)", value: "+688" },
  { label: "U.S. Virgin Islands (+1-340)", value: "+1340" },
  { label: "Uganda (+256)", value: "+256" },
  { label: "Ukraine (+380)", value: "+380" },
  { label: "United Arab Emirates (+971)", value: "+971" },
  { label: "United Kingdom (+44)", value: "+44" },
  { label: "United States (+1)", value: "+1" },
  { label: "Uruguay (+598)", value: "+598" },
  { label: "Uzbekistan (+998)", value: "+998" },
  { label: "Vanuatu (+678)", value: "+678" },
  { label: "Vatican City (+379)", value: "+379" },
  { label: "Venezuela (+58)", value: "+58" },
  { label: "Vietnam (+84)", value: "+84" },
  { label: "Yemen (+967)", value: "+967" },
  { label: "Zambia (+260)", value: "+260" },
  { label: "Zimbabwe (+263)", value: "+263" },
];

const normalizeCountryPhoneCode = (value: string) => value.trim();
const digitsOnly = (value: string) => value.replace(/\D/g, "");

const buildFullPhoneNumber = (countryCode: string, localPhone: string) => {
  const code = normalizeCountryPhoneCode(countryCode).trim();
  const local = digitsOnly(localPhone);
  if (!code || !local) return "";
  return `${code}${local}`;
};

const COMMON_FAKE_WORDS = new Set([
  "test",
  "testing",
  "asdf",
  "qwerty",
  "zxcv",
  "abc",
  "abcd",
  "aaa",
  "bbb",
  "ccc",
  "xxx",
  "nil",
  "no",
  "yes",
  "sample",
]);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const formatProfessionFromSpecialization = (
  role: RoleOption,
  specialization: string,
  fallbackProfession: string
) => {
  if (!specialization) return fallbackProfession;
  if (role === "coach" || role === "therapist") return specialization;
  if (role === "creator") return `${specialization} Creator`;
  return fallbackProfession;
};

const hasLetters = (value: string) => /[a-zA-Z]/.test(value);
const hasOnlyNumbersOrSymbols = (value: string) => !/[a-zA-Z]/.test(value);
const repeatedCharsOnly = (value: string) =>
  /^([a-zA-Z0-9])\1+$/.test(value.trim());
const tooFewWords = (value: string, minWords = 2) =>
  value.trim().split(/\s+/).filter(Boolean).length < minWords;

const isObviouslyFakeText = (value: string) => {
  const cleaned = value.trim().toLowerCase();
  if (!cleaned) return true;
  if (COMMON_FAKE_WORDS.has(cleaned)) return true;
  if (cleaned.length < 3) return true;
  if (repeatedCharsOnly(cleaned)) return true;
  if (hasOnlyNumbersOrSymbols(cleaned)) return true;
  return false;
};

const isValidHumanName = (value: string) => {
  const cleaned = value.trim();
  if (cleaned.length < 5) return false;
  if (!hasLetters(cleaned)) return false;
  if (tooFewWords(cleaned, 2)) return false;
  if (isObviouslyFakeText(cleaned)) return false;
  return true;
};

const isValidShortText = (value: string, minLength = 4) => {
  const cleaned = value.trim();
  if (cleaned.length < minLength) return false;
  if (!hasLetters(cleaned)) return false;
  if (isObviouslyFakeText(cleaned)) return false;
  return true;
};

const isValidLongText = (value: string, minLength = 20, minWords = 4) => {
  const cleaned = value.trim();
  if (cleaned.length < minLength) return false;
  if (!hasLetters(cleaned)) return false;
  if (tooFewWords(cleaned, minWords)) return false;
  if (isObviouslyFakeText(cleaned)) return false;
  return true;
};

const isValidPhone = (countryCode: string, value: string) => {
  const normalizedCode = normalizeCountryPhoneCode(countryCode).trim();
  const cleaned = digitsOnly(value);
  if (!normalizedCode.startsWith("+")) return false;
  if (cleaned.length < 7 || cleaned.length > 14) return false;
  return true;
};

const isValidUrlIfProvided = (value: string) => {
  const cleaned = value.trim();
  if (!cleaned) return true;

  try {
    const normalized =
      cleaned.startsWith("http://") || cleaned.startsWith("https://")
        ? cleaned
        : `https://${cleaned}`;
    new URL(normalized);
    return true;
  } catch {
    return false;
  }
};

const isValidImageFile = (file: File | null) => {
  if (!file) return false;
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  const maxSize = 5 * 1024 * 1024;
  return allowedTypes.includes(file.type) && file.size <= maxSize;
};

const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> => {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
};

const getDashboardRoute = (role: RoleOption) => roleToDashboardPath(role);

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile, refreshRoles, refreshAll, loading: authLoading } = useAuth();

  const [selectedRole, setSelectedRole] = useState<RoleOption>("learner");
  const [step, setStep] = useState(1);

  const [profession, setProfession] = useState("");
  const [experience, setExperience] = useState("");
  const [certification, setCertification] = useState("");

  const [specialization, setSpecialization] = useState("");
  const [customSpecialization, setCustomSpecialization] = useState("");

  const [fullName, setFullName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+234");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [learnerInterests, setLearnerInterests] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessWebsite, setBusinessWebsite] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [headline, setHeadline] = useState("");
  const [languages, setLanguages] = useState("");
  const [servicesOffered, setServicesOffered] = useState("");
  const [worksWith, setWorksWith] = useState("");
  const [expertiseAreas, setExpertiseAreas] = useState("");
  const [serviceAreas, setServiceAreas] = useState("");
  const [serviceDeliveryMode, setServiceDeliveryMode] = useState<
    "online" | "in_person" | "both"
  >("online");
  const [calendarMode, setCalendarMode] = useState<
    "open_schedule" | "provider_calendar"
  >("provider_calendar");
  const [meetingPreference, setMeetingPreference] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [enablePhoneRelease, setEnablePhoneRelease] = useState(true);

  const [learnerGoal, setLearnerGoal] = useState("");
  const [customLearnerGoal, setCustomLearnerGoal] = useState("");
  const [learnerLookingForward, setLearnerLookingForward] = useState("");

  const [loading, setLoading] = useState(false);
  const [didInitializeRole, setDidInitializeRole] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Timeout fallback if auth loading takes too long
  useEffect(() => {
    if (authLoading) {
      const timer = setTimeout(() => {
        console.warn("Auth loading timeout - forcing render");
        setLoadingTimeout(true);
      }, 5000); // 5 second timeout
      return () => clearTimeout(timer);
    }
  }, [authLoading]);

  const currentSpecializationConfig = useMemo(
    () => specializationConfig[selectedRole],
    [selectedRole]
  );

  const resolvedSpecialization =
    specialization === "Other"
      ? customSpecialization.trim()
      : specialization.trim();

  const resolvedLearnerGoal =
    learnerGoal === "Other" ? customLearnerGoal.trim() : learnerGoal.trim();

  const isCoach = selectedRole === "coach";
  const isTherapist = selectedRole === "therapist";
  const isCreator = selectedRole === "creator";
  const isLearner = selectedRole === "learner";
  const isProviderRole = isCoach || isTherapist;

  const totalSteps = useMemo(() => {
    if (selectedRole === "learner") return 4;
    if (selectedRole === "creator") return 5;
    if (selectedRole === "coach" || selectedRole === "therapist") return 7;
    return 4;
  }, [selectedRole]);

  useEffect(() => {
    if (!user || didInitializeRole) return;

    const rawPreferredRole =
      profile?.role ??
      user.user_metadata?.requested_role ??
      user.user_metadata?.role;

    const preferredRole = safeRoleOption(
      normalizeRole(rawPreferredRole),
      "learner"
    );

    setSelectedRole(preferredRole);
    setDidInitializeRole(true);
  }, [user, profile?.role, didInitializeRole]);

  useEffect(() => {
    if (!user) return;

    const authName =
      typeof user.user_metadata?.full_name === "string" &&
      user.user_metadata.full_name.trim()
        ? user.user_metadata.full_name.trim()
        : typeof user.user_metadata?.name === "string" &&
          user.user_metadata.name.trim()
        ? user.user_metadata.name.trim()
        : "";

    if (authName && !fullName) setFullName(authName);
    if (authName && !displayName) setDisplayName(authName);
    if (profile?.country && !country) setCountry(profile.country);

    if (profile?.phone && !phone) {
      const savedPhone = String(profile.phone).trim();
      const matchedPhoneCode = COUNTRY_PHONE_CODE_OPTIONS.find((option) =>
        savedPhone.startsWith(normalizeCountryPhoneCode(option.value))
      );

      if (matchedPhoneCode) {
        const normalizedCode = normalizeCountryPhoneCode(matchedPhoneCode.value);
        setPhoneCountryCode(matchedPhoneCode.value);
        setPhone(savedPhone.replace(normalizedCode, "").trim());
      } else {
        setPhone(savedPhone);
      }
    }

    if (profile?.avatar_url && !avatarPreview) {
      setAvatarPreview(profile.avatar_url);
    }
  }, [user, profile, fullName, displayName, country, phone, avatarPreview]);

  useEffect(() => {
    return () => {
      if (avatarPreview && avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const applyRoleDefaults = (role: RoleOption) => {
    const safeRole = safeRoleOption(role, "learner");

    setDidInitializeRole(true);
    setSelectedRole(safeRole);
    setStep(1);

    setProfession("");
    setExperience("");
    setCertification("");
    setSpecialization("");
    setCustomSpecialization("");

    setBusinessName("");
    setBusinessEmail("");
    setBusinessPhone("");
    setBusinessWebsite("");
    setBusinessAddress("");
    setBusinessDescription("");
    setHeadline("");
    setLanguages("");
    setServicesOffered("");
    setWorksWith("");
    setExpertiseAreas("");
    setServiceAreas("");
    setServiceDeliveryMode("online");
    setCalendarMode("provider_calendar");
    setMeetingPreference("");
    setOfficeAddress("");
    setEnablePhoneRelease(true);

    setLearnerGoal("");
    setCustomLearnerGoal("");
    setLearnerLookingForward("");
    setLearnerInterests("");
  };

  const validateAvatar = () => {
    if (!avatarFile && !avatarPreview) {
      toast.error("Please upload your profile image.");
      return false;
    }

    if (!avatarFile && avatarPreview) return true;

    if (!isValidImageFile(avatarFile)) {
      toast.error(
        "Upload a valid image file (JPG, PNG, or WEBP) not bigger than 5MB."
      );
      return false;
    }

    return true;
  };

  const validatePersonalInfo = () => {
    if (!isValidHumanName(fullName)) {
      toast.error(
        "Enter your real full name. Use at least first name and last name."
      );
      return false;
    }

    if (displayName.trim() && !isValidShortText(displayName, 3)) {
      toast.error("Enter a valid display name.");
      return false;
    }

    if (!isValidPhone(phoneCountryCode, phone)) {
      toast.error("Enter a valid phone number with the selected country code.");
      return false;
    }

    if (!isValidShortText(country, 3)) {
      toast.error("Enter a real country name.");
      return false;
    }

    if (city.trim() && !isValidShortText(city, 2)) {
      toast.error("Enter a valid city name.");
      return false;
    }

    if (isLearner && learnerInterests.trim()) {
      if (!isValidLongText(learnerInterests, 6, 1)) {
        toast.error("Enter real learner interests.");
        return false;
      }
    }

    return true;
  };

  const validateLearnerInfo = () => {
    if (!resolvedLearnerGoal || isObviouslyFakeText(resolvedLearnerGoal)) {
      toast.error("Choose a valid learning goal.");
      return false;
    }

    if (!isValidLongText(learnerLookingForward, 20, 4)) {
      toast.error("Tell us clearly what you are looking forward to.");
      return false;
    }

    return true;
  };

  const validateSpecialization = () => {
    if (!resolvedSpecialization) {
      toast.error("Please choose your specialization.");
      return false;
    }

    if (!isValidShortText(resolvedSpecialization, 4)) {
      toast.error("Choose or enter a real specialization.");
      return false;
    }

    return true;
  };

  const validateCoachProfileInfo = () => {
    if (!isValidShortText(profession, 4)) {
      toast.error("Add a professional coaching title.");
      return false;
    }

    if (!isValidShortText(headline, 10)) {
      toast.error("Write a clear coaching headline.");
      return false;
    }

    if (!isValidLongText(bio, 40, 8)) {
      toast.error("Add a proper coach About section.");
      return false;
    }

    if (!isValidLongText(experience, 30, 6)) {
      toast.error("Describe your coaching style and approach clearly.");
      return false;
    }

    if (!isValidShortText(languages, 3)) {
      toast.error("List the languages you support.");
      return false;
    }

    return true;
  };

  const validateTherapistProfileInfo = () => {
    if (!isValidShortText(profession, 4)) {
      toast.error("Add a professional therapist title.");
      return false;
    }

    if (!isValidShortText(headline, 10)) {
      toast.error("Write a clear therapist headline.");
      return false;
    }

    if (!isValidLongText(bio, 40, 8)) {
      toast.error("Add a proper therapist About section.");
      return false;
    }

    if (!isValidLongText(experience, 30, 6)) {
      toast.error("Describe your therapeutic approach clearly.");
      return false;
    }

    if (!isValidShortText(languages, 3)) {
      toast.error("List the languages you support.");
      return false;
    }

    return true;
  };

  const validateCreatorProfileInfo = () => {
    if (!isValidShortText(profession, 4)) {
      toast.error("Enter a real creator title.");
      return false;
    }

    if (!isValidShortText(headline, 10)) {
      toast.error("Write a clear creator headline.");
      return false;
    }

    if (!isValidLongText(bio, 30, 6)) {
      toast.error("Write a proper creator bio.");
      return false;
    }

    if (!isValidLongText(experience, 20, 4)) {
      toast.error("Describe your content background clearly.");
      return false;
    }

    if (!isValidShortText(languages, 3)) {
      toast.error("List the languages you support.");
      return false;
    }

    return true;
  };

  const validateCoachProfessionalInfo = () => {
    if (!isValidShortText(servicesOffered, 4)) {
      toast.error("List the coaching services clients can book.");
      return false;
    }

    if (!isValidShortText(worksWith, 4)) {
      toast.error("Tell clients who you coach.");
      return false;
    }

    if (!isValidShortText(expertiseAreas, 4)) {
      toast.error("Add your coaching expertise.");
      return false;
    }

    if (!isValidShortText(certification, 4)) {
      toast.error("Add your coaching certification or qualification.");
      return false;
    }

    if (!isValidShortText(serviceAreas, 4)) {
      toast.error("Add at least one service area or location.");
      return false;
    }

    return true;
  };

  const validateTherapistProfessionalInfo = () => {
    if (!isValidShortText(servicesOffered, 4)) {
      toast.error("List the therapy services clients can book.");
      return false;
    }

    if (!isValidShortText(worksWith, 4)) {
      toast.error("Tell clients who you work with.");
      return false;
    }

    if (!isValidShortText(expertiseAreas, 4)) {
      toast.error("Add your therapy expertise.");
      return false;
    }

    if (!isValidShortText(certification, 4)) {
      toast.error("Add your therapy qualifications or license.");
      return false;
    }

    if (!isValidShortText(serviceAreas, 4)) {
      toast.error("Add at least one service area or location.");
      return false;
    }

    return true;
  };

  const validateCreatorBusinessInfo = () => {
    if (!isValidShortText(businessName, 4)) {
      toast.error("Enter a real brand or studio name.");
      return false;
    }

    if (
      businessEmail.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(businessEmail.trim())
    ) {
      toast.error("Enter a valid business email.");
      return false;
    }

    if (businessPhone.trim() && digitsOnly(businessPhone).length < 7) {
      toast.error("Enter a valid business phone number.");
      return false;
    }

    if (!isValidUrlIfProvided(businessWebsite)) {
      toast.error("Enter a valid website or portfolio link.");
      return false;
    }

    if (businessAddress.trim() && !isValidLongText(businessAddress, 6, 2)) {
      toast.error("Enter a real business address.");
      return false;
    }

    if (!isValidLongText(businessDescription, 20, 4)) {
      toast.error("Enter a real business description.");
      return false;
    }

    return true;
  };

  const validateProviderServiceSetup = () => {
    if (isProviderRole && !serviceDeliveryMode) {
      toast.error("Choose how you offer your services.");
      return false;
    }

    if (isProviderRole && serviceDeliveryMode !== "online") {
      if (!officeAddress.trim()) {
        toast.error("Enter your real office address for in-person sessions.");
        return false;
      }

      if (!isValidLongText(officeAddress, 10, 3)) {
        toast.error("Enter a full real office address for in-person sessions.");
        return false;
      }
    }

    return true;
  };

  const handleAvatarChange = (file: File | null) => {
    if (avatarPreview && avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(file);

    if (!file) {
      setAvatarPreview("");
      return;
    }

    if (!isValidImageFile(file)) {
      toast.error(
        "Upload a valid image file (JPG, PNG, or WEBP) not bigger than 5MB."
      );
      setAvatarFile(null);
      setAvatarPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setAvatarPreview(objectUrl);
  };

  const uploadAvatar = async () => {
    if (!user?.id || !avatarFile) return null;

    const extension = avatarFile.name.split(".").pop() || "jpg";
    const safeExtension = extension.toLowerCase();
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${safeExtension}`;
    const filePath = `${user.id}/${fileName}`;

    const { error } = await supabase.storage
      .from("avatars")
      .upload(filePath, avatarFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const goNext = () => {
    if (step === 1) {
      setStep(2);
      return;
    }

    if (isLearner) {
      if (step === 2) {
        if (!validateLearnerInfo()) return;
        setStep(3);
        return;
      }

      if (step === 3) {
        if (!validatePersonalInfo()) return;
        setStep(4);
        return;
      }

      if (step === 4) {
        finishOnboarding();
        return;
      }

      return;
    }

    if (step === 2) {
      if (!validateSpecialization()) return;
      setStep(3);
      return;
    }

    if (step === 3) {
      if (!validatePersonalInfo()) return;
      setStep(4);
      return;
    }

    if (step === 4) {
      if (isCoach) {
        if (!validateCoachProfileInfo()) return;
      }

      if (isTherapist) {
        if (!validateTherapistProfileInfo()) return;
      }

      if (isCreator) {
        if (!validateCreatorProfileInfo()) return;
      }

      setStep(5);
      return;
    }

    if (step === 5) {
      if (isCoach) {
        if (!validateCoachProfessionalInfo()) return;
        setStep(6);
        return;
      }

      if (isTherapist) {
        if (!validateTherapistProfessionalInfo()) return;
        setStep(6);
        return;
      }

      if (isCreator) {
        if (!validateCreatorBusinessInfo()) return;
        finishOnboarding();
        return;
      }
    }

    if (step === 6) {
      if (!validateProviderServiceSetup()) return;
      setStep(7);
      return;
    }

    if (step === 7) {
      finishOnboarding();
      return;
    }
  };

  const goBack = () => {
    if (step > 1) setStep((prev) => prev - 1);
  };

  const finishOnboarding = async () => {
    if (loading) return;

    if (!user?.id) {
      toast.error("No active user session found.");
      return;
    }

    const finalRole = safeRoleOption(selectedRole, "learner");

    // Avatar is optional — skip hard block, just warn
    if (!avatarFile && !avatarPreview) {
      console.warn("No avatar provided, continuing without one.");
    }

    if (finalRole === "learner") {
      if (!validateLearnerInfo()) return;
      if (!validatePersonalInfo()) return;
    }

    if (finalRole === "coach") {
      if (!validateSpecialization()) return;
      if (!validatePersonalInfo()) return;
      if (!validateCoachProfileInfo()) return;
      if (!validateCoachProfessionalInfo()) return;
      if (!validateProviderServiceSetup()) return;
    }

    if (finalRole === "therapist") {
      if (!validateSpecialization()) return;
      if (!validatePersonalInfo()) return;
      if (!validateTherapistProfileInfo()) return;
      if (!validateTherapistProfessionalInfo()) return;
      if (!validateProviderServiceSetup()) return;
    }

    if (finalRole === "creator") {
      if (!validateSpecialization()) return;
      if (!validatePersonalInfo()) return;
      if (!validateCreatorProfileInfo()) return;
      if (!validateCreatorBusinessInfo()) return;
    }

    try {
      setLoading(true);

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!authUser?.id) throw new Error("Authenticated user not found.");

      const enforcedRole: RoleOption =
        finalRole === "therapist"
          ? "therapist"
          : finalRole === "coach"
          ? "coach"
          : finalRole === "creator"
          ? "creator"
          : "learner";

      const nextProfession =
        enforcedRole === "learner"
          ? null
          : formatProfessionFromSpecialization(
              enforcedRole,
              resolvedSpecialization,
              profession.trim()
            );

      const slugBase =
        enforcedRole === "learner"
          ? resolvedLearnerGoal || fullName || authUser.id.slice(0, 8)
          : resolvedSpecialization ||
            profession ||
            fullName ||
            authUser.id.slice(0, 8);

      const profileSlug = `${enforcedRole}-${slugify(slugBase)}-${authUser.id.slice(
        0,
        8
      )}`;

      let avatarUrl: string | null = avatarPreview || null;

      if (avatarFile) {
        avatarUrl = await withTimeout(
          uploadAvatar(),
          20000,
          "Avatar upload took too long. Please try again."
        );
      }

      const finalBio =
        enforcedRole === "learner"
          ? learnerInterests.trim()
            ? `Interests: ${learnerInterests.trim()}`
            : null
          : bio.trim() || null;

      const languageArray = languages
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const expertiseArray = expertiseAreas
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      const fullPhoneNumber = buildFullPhoneNumber(phoneCountryCode, phone);

      let onboardingRpcError: any = null;

      // ── Step 1: Save the core profile fields (columns that exist in schema) ──
      const coreProfile = {
        user_id: authUser.id,
        full_name: fullName.trim() || null,
        avatar_url: avatarUrl || null,
        bio: finalBio,
        phone: fullPhoneNumber || null,
        country: country.trim() || null,
        onboarding_completed: true,
      };

      const { error: coreError } = await supabase
        .from("profiles")
        .upsert(coreProfile, { onConflict: "user_id" });

      if (coreError) {
        console.error("Core profile save error:", coreError);
        throw new Error(`Profile save failed: ${coreError.message}`);
      }
      console.log("Core profile saved successfully");

      // ── Step 2: Save extended fields via RPC (handles missing columns gracefully) ──
      try {
        await withTimeout(
          supabase.rpc("complete_onboarding" as any, {
            p_role: enforcedRole,
            p_full_name: fullName.trim() || null,
            p_display_name: displayName.trim() || null,
            p_avatar_url: avatarUrl || null,
            p_email: authUser.email || null,
            p_phone: fullPhoneNumber || null,
            p_country: country.trim() || null,
            p_city: city.trim() || null,
            p_bio: finalBio || null,
            p_profession: nextProfession,
            p_experience: enforcedRole === "learner" ? null : experience.trim() || null,
            p_certification: enforcedRole === "learner" ? null : certification.trim() || null,
            p_specialization_type: enforcedRole === "learner" ? null : resolvedSpecialization || null,
            p_specialization_slug: enforcedRole === "learner" ? null : resolvedSpecialization ? slugify(resolvedSpecialization) : null,
            p_business_name: enforcedRole === "creator" ? businessName.trim() || null : null,
            p_business_email: enforcedRole === "creator" ? businessEmail.trim() || null : null,
            p_business_phone: enforcedRole === "creator" ? businessPhone.trim() || null : null,
            p_business_website: enforcedRole === "creator" ? businessWebsite.trim() || null : null,
            p_business_address: enforcedRole === "creator" ? businessAddress.trim() || null : null,
            p_business_description: enforcedRole === "creator" ? businessDescription.trim() || null : null,
            p_learner_goal: enforcedRole === "learner" ? resolvedLearnerGoal || null : null,
            p_learner_looking_forward: enforcedRole === "learner" ? learnerLookingForward.trim() || null : null,
            p_profile_slug: profileSlug,
            p_onboarding_completed: true,
          }),
          15000,
          "RPC timeout"
        );
        console.log("Extended profile saved via RPC");
      } catch (rpcErr) {
        onboardingRpcError = rpcErr;
        console.warn("RPC failed (non-blocking):", rpcErr);
      }

      // ── Step 3: Save user role ────────────────────────────────────────────
      await supabase
        .from("user_roles")
        .upsert({ user_id: authUser.id, role: enforcedRole }, { onConflict: "user_id,role", ignoreDuplicates: true })
        .then(({ error }) => { if (error) console.warn("Role save:", error.message); });

      // Update auth metadata
      try {
        await supabase.auth.updateUser({
          data: {
            role: enforcedRole,
            requested_role: enforcedRole,
            account_type: enforcedRole,
            provider_type: enforcedRole === "learner" ? null : enforcedRole,
            avatar_url: avatarUrl || null,
            full_name: fullName.trim() || null,
          },
        });
        console.log("Auth metadata updated successfully");
      } catch (authError) {
        console.warn("Auth metadata update failed:", authError);
      }

      // Create wallet
      try {
        await supabase
          .from("wallets")
          .upsert(
            {
              user_id: authUser.id,
              currency: "USD",
              balance: 0,
              pending_balance: 0,
              available_balance: 0,
            },
            { onConflict: "user_id", ignoreDuplicates: true }
          );
        console.log("Wallet created successfully");
      } catch (walletError) {
        console.warn("Wallet creation failed:", walletError);
      }

      // Create provider profile if needed
      if (enforcedRole === "coach" || enforcedRole === "therapist") {
        try {
          const tableName = enforcedRole === "therapist" ? "therapist_profiles" : "coach_profiles";
          
          const { error: providerError } = await supabase
            .from(tableName)
            .upsert(
              {
                user_id: authUser.id,
                headline: headline.trim() || null,
                skills: expertiseArray,
                languages: languageArray,
                is_active: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" }
            );

          if (providerError) {
            console.warn(`${enforcedRole} profile save warning:`, providerError);
          } else {
            console.log(`${enforcedRole} profile created successfully`);
          }
        } catch (providerError) {
          console.warn(`${enforcedRole} profile creation failed:`, providerError);
        }
      }

      // Send welcome email
      try {
        await fetch(buildBackendUrl("/api/notifications/welcome"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: authUser.id,
            email: authUser.email,
            full_name: fullName.trim(),
            role: enforcedRole,
          }),
        });
        console.log("Welcome email sent successfully");
      } catch (err) {
        console.warn("Welcome email notification failed:", err);
      }

      // Refresh user data
      await Promise.all([
        refreshProfile(),
        refreshRoles(),
        refreshAll(),
        new Promise((resolve) =>
          window.setTimeout(
            () => resolve(refreshRoles()),
            3000,
            "refreshRoles second pass timed out"
          )
        ),
      ]);

      console.log("Onboarding completed successfully!");
      toast.success("Onboarding completed successfully!");

      const dashboardRoute = getDashboardRoute(enforcedRole);
      setLoading(false);

      window.setTimeout(() => {
        navigate(dashboardRoute, { replace: true });
      }, 150);

      return;
    } catch (error: any) {
      console.error("Onboarding error:", error);

      const message =
        error?.message ||
        error?.details ||
        error?.hint ||
        "Failed to complete onboarding";

      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const stepTitle = useMemo(() => {
    if (isLearner) {
      if (step === 2) return "Learning goals";
      if (step === 3) return "Personal information";
      if (step === 4) return "Review and finish";
    }

    if (isCoach) {
      if (step === 2) return "Choose coaching type";
      if (step === 3) return "Personal information";
      if (step === 4) return "Coach public profile";
      if (step === 5) return "Coaching services";
      if (step === 6) return "Booking setup";
      if (step === 7) return "Review and finish";
    }

    if (isTherapist) {
      if (step === 2) return "Choose therapy type";
      if (step === 3) return "Personal information";
      if (step === 4) return "Therapist public profile";
      if (step === 5) return "Therapy services";
      if (step === 6) return "Booking setup";
      if (step === 7) return "Review and finish";
    }

    if (isCreator) {
      if (step === 2) return "Choose content niche";
      if (step === 3) return "Personal information";
      if (step === 4) return "Creator public profile";
      if (step === 5) return "Brand and business details";
    }

    return "Complete your account";
  }, [isLearner, isCoach, isTherapist, isCreator, step]);

  // Show loading while auth is initializing (with timeout)
  if (authLoading && !loadingTimeout) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-sm text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // After timeout or if not loading, check for user
  if (!user && !loadingTimeout) {
    console.log("Onboarding: No user, redirecting to login");
    navigate("/login", { replace: true });
    return null;
  }

  // If we have a user but profile shows onboarding is complete, redirect
  if (user && profile?.onboarding_completed) {
    console.log("Onboarding: Already completed, redirecting to dashboard");
    const role = profile.role || "learner";
    navigate(roleToDashboardPath(role as any), { replace: true });
    return null;
  }

  // If timeout occurred but we have a user, continue to onboarding form
  if (loadingTimeout && user) {
    console.log("Onboarding: Timeout occurred but user exists, rendering form");
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.10),_transparent_35%),linear-gradient(180deg,#f8fafc_0%,#ffffff_48%,#f8fafc_100%)] px-4 py-10">
      <ScrollableContent maxHeight="h-screen" className="mx-auto w-full max-w-5xl">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-medium text-primary">
            Step {step} of {totalSteps}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-5xl">
            {stepTitle}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Complete your Coursevia onboarding with the right details for your
            selected role.
          </p>
        </div>

        {step === 1 && (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {roleOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => applyRoleDefaults(option.value)}
                  className={`rounded-2xl border p-0 text-left transition ${
                    selectedRole === option.value
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <Card className="border-0 bg-transparent shadow-none">
                    <CardContent className="p-6">
                      <h2 className="text-xl font-semibold text-foreground">
                        {option.title}
                      </h2>
                      <p className="mt-2 text-muted-foreground">
                        {option.description}
                      </p>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={goNext}>Continue</Button>
            </div>
          </>
        )}

        {isLearner && step === 2 && (
          <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                <GraduationCap className="h-3.5 w-3.5" />
                Learner setup
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                Learning goals
              </h2>
              <p className="text-sm text-muted-foreground">
                Tell us what you want to achieve so we can shape your learner
                experience properly.
              </p>
            </div>

            <div>
              <Label>What is your main goal?</Label>
              <Select value={learnerGoal} onValueChange={setLearnerGoal}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your goal" />
                </SelectTrigger>
                <SelectContent>
                  {learnerGoalOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {learnerGoal === "Other" && (
              <div>
                <Label>Enter your goal</Label>
                <Input
                  value={customLearnerGoal}
                  onChange={(e) => setCustomLearnerGoal(e.target.value)}
                  placeholder="Type your goal"
                />
              </div>
            )}

            <div>
              <Label>What are you looking forward to?</Label>
              <Textarea
                value={learnerLookingForward}
                onChange={(e) => setLearnerLookingForward(e.target.value)}
                placeholder="Tell us what you want to gain from Coursevia"
                rows={4}
                className="resize-none"
              />
            </div>

            <div>
              <Label>Your interests</Label>
              <Input
                value={learnerInterests}
                onChange={(e) => setLearnerInterests(e.target.value)}
                placeholder="Example: design, finance, coding, wellness"
              />
            </div>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={goBack}>
                Back
              </Button>
              <Button onClick={goNext}>Continue</Button>
            </div>
          </div>
        )}

        {!isLearner && step === 2 && (
          <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                {isCoach
                  ? "Choose coaching type"
                  : isTherapist
                  ? "Choose therapy type"
                  : "Choose content niche"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Select the main area that best describes your work on Coursevia.
              </p>
            </div>

            {currentSpecializationConfig && (
              <>
                <div>
                  <Label>{currentSpecializationConfig.label}</Label>
                  <Select
                    value={specialization}
                    onValueChange={setSpecialization}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={currentSpecializationConfig.placeholder}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {currentSpecializationConfig.options.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {specialization === "Other" && (
                  <div>
                    <Label>Enter your specialization</Label>
                    <Input
                      value={customSpecialization}
                      onChange={(e) => setCustomSpecialization(e.target.value)}
                      placeholder="Type your specialization"
                    />
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={goBack}>
                Back
              </Button>
              <Button onClick={goNext}>Continue</Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="mx-auto max-w-3xl space-y-6 rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Personal information
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                Add the real personal details tied to your Coursevia account.
              </p>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-gradient-to-br from-white to-slate-50">
              <div className="grid gap-6 p-4 sm:p-5 md:grid-cols-[120px_minmax(0,1fr)] md:items-center md:p-6">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <ProfileAvatar
                      src={avatarPreview}
                      name={fullName || displayName || user?.email || "Profile"}
                      className="h-24 w-24 border-4 border-white object-cover shadow-lg sm:h-28 sm:w-28"
                      fallbackClassName="bg-slate-950 text-white text-2xl font-semibold"
                    />
                    <div className="absolute -bottom-1 -right-1 rounded-full border border-slate-200 bg-white p-2 shadow-sm">
                      <Camera className="h-4 w-4 text-slate-600" />
                    </div>
                  </div>

                  <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-center text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">Profile photo</span>
                  </div>
                </div>

                <div className="min-w-0 space-y-4">
                  <div>
                    <Label className="text-sm font-semibold text-slate-900">
                      Profile photo *
                    </Label>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Upload a clear profile photo for your account.
                    </p>
                  </div>

                  <label className="block w-full cursor-pointer rounded-2xl border border-dashed border-slate-300 bg-white p-4 transition hover:border-emerald-400 hover:bg-emerald-50/40 sm:p-5">
                    <div className="flex flex-col gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="shrink-0 rounded-2xl bg-slate-100 p-3">
                          <UploadCloud className="h-5 w-5 text-slate-700" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900">
                            {avatarPreview
                              ? "Change profile image"
                              : "Choose profile image"}
                          </p>
                          <p className="text-sm leading-6 text-slate-500">
                            PNG, JPG, or WEBP up to 5MB. Use a clear headshot.
                          </p>
                        </div>
                      </div>

                      {(avatarFile || avatarPreview) && (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                          <p className="text-xs font-medium text-emerald-700">
                            {avatarFile ? "Selected file" : "Uploaded image"}
                          </p>
                          <p className="mt-1 break-all text-sm text-slate-700">
                            {avatarFile
                              ? avatarFile.name
                              : "Image uploaded successfully"}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-start">
                        <div className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                          {avatarFile
                            ? "Photo selected"
                            : avatarPreview
                            ? "Photo added"
                            : "Browse files"}
                        </div>
                      </div>
                    </div>

                    <input
                      className="hidden"
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={(e) =>
                        handleAvatarChange(e.target.files?.[0] || null)
                      }
                    />
                  </label>
                </div>
              </div>
            </div>

            <div>
              <Label>Full name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your legal first and last name"
              />
            </div>

            <div>
              <Label>Display name</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Choose the name people will see"
              />
            </div>

            <div>
              <Label>Phone</Label>
              <div className="mt-2 flex gap-2">
                <Select
                  value={phoneCountryCode}
                  onValueChange={setPhoneCountryCode}
                >
                  <SelectTrigger className="w-[140px] shrink-0">
                    <SelectValue placeholder="Code" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {COUNTRY_PHONE_CODE_OPTIONS.map((option) => (
                      <SelectItem key={option.label} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter your real phone number"
                  inputMode="tel"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Country</Label>
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="Country where you are based"
                />
              </div>

              <div>
                <Label>City</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City or service area"
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={goBack}>
                Back
              </Button>
              <Button onClick={goNext}>Continue</Button>
            </div>
          </div>
        )}

        {!isLearner && step === 4 && (
          <div className="mx-auto max-w-3xl space-y-6 rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-8">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                {isCoach ? (
                  <HeartHandshake className="h-3.5 w-3.5" />
                ) : isTherapist ? (
                  <HeartHandshake className="h-3.5 w-3.5" />
                ) : (
                  <Video className="h-3.5 w-3.5" />
                )}
                Public role profile
              </div>

              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                {isCoach
                  ? "Build your coach profile"
                  : isTherapist
                  ? "Build your therapist profile"
                  : "Build your creator profile"}
              </h2>

              <p className="text-sm leading-6 text-slate-600">
                Add the main details people will read first on your profile.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <Label>
                  {isCoach
                    ? "Professional coaching title"
                    : isTherapist
                    ? "Professional therapist title"
                    : "Creator title"}
                </Label>
                <Input
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder={
                    isCoach
                      ? "Example: Relationship Coach"
                      : isTherapist
                      ? "Example: Licensed Therapist"
                      : "Example: Business Educator"
                  }
                />
              </div>

              <div>
                <Label>Languages</Label>
                <Input
                  value={languages}
                  onChange={(e) => setLanguages(e.target.value)}
                  placeholder="Example: English, French, Yoruba"
                />
              </div>
            </div>

            <div>
              <Label>Profile headline</Label>
              <Input
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder={
                  isCoach
                    ? "Short line that tells people what kind of coaching you provide"
                    : isTherapist
                    ? "Short line that tells people the support you provide"
                    : "Short line that tells people what your content helps them achieve"
                }
              />
            </div>

            <div>
              <Label>
                {isCoach
                  ? "About your coaching practice"
                  : isTherapist
                  ? "About your therapy practice"
                  : "About you and your content"}
              </Label>
              <Textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={
                  isCoach
                    ? "Explain who you help, what kind of coaching you offer, and what clients can expect"
                    : isTherapist
                    ? "Explain who you support, what kind of therapy you offer, and what clients can expect"
                    : "Explain what you teach, who your videos are for, and what learners can expect"
                }
                rows={4}
                className="resize-none"
              />
            </div>

            <div>
              <Label>
                {isCoach
                  ? "Coaching approach"
                  : isTherapist
                  ? "Approach"
                  : "Content background / teaching approach"}
              </Label>
              <Textarea
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                placeholder={
                  isCoach
                    ? "Describe your coaching method, style, or transformation process"
                    : isTherapist
                    ? "Describe your therapeutic method, style, or treatment approach"
                    : "Describe your experience, method, and how you teach through your content"
                }
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={goBack}>
                Back
              </Button>
              <Button onClick={goNext}>Continue</Button>
            </div>
          </div>
        )}

        {(isCoach || isTherapist) && step === 5 && (
          <div className="mx-auto max-w-3xl space-y-6 rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-8">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                <ListChecks className="h-3.5 w-3.5" />
                {isCoach ? "Coaching setup" : "Therapy setup"}
              </div>

              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                {isCoach
                  ? "Add your coaching services"
                  : "Add your therapy services"}
              </h2>

              <p className="text-sm leading-6 text-slate-600">
                Add the details that help clients understand what you offer.
              </p>
            </div>

            <div>
              <Label>
                {isCoach
                  ? "Coaching services offered"
                  : "Therapy services offered"}
              </Label>
              <Textarea
                value={servicesOffered}
                onChange={(e) => setServicesOffered(e.target.value)}
                placeholder={
                  isCoach
                    ? "Example: 1-on-1 Coaching, Group Coaching, Career Coaching, Discovery Calls"
                    : "Example: Individual Therapy, Couples Therapy, Online Sessions, Consultations"
                }
                rows={4}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <Label>{isCoach ? "Who you coach" : "Who you work with"}</Label>
                <Textarea
                  value={worksWith}
                  onChange={(e) => setWorksWith(e.target.value)}
                  placeholder={
                    isCoach
                      ? "Example: Founders, Professionals, Couples, Students"
                      : "Example: Adults, Couples, Adolescents, Families"
                  }
                  rows={4}
                />
              </div>

              <div>
                <Label>
                  {isCoach ? "Coaching expertise" : "Therapy expertise"}
                </Label>
                <Textarea
                  value={expertiseAreas}
                  onChange={(e) => setExpertiseAreas(e.target.value)}
                  placeholder={
                    isCoach
                      ? "Example: Mindset, Leadership, Relationships, Career Growth"
                      : "Example: Anxiety, Trauma, Depression, Stress, Grief"
                  }
                  rows={4}
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <Label>
                  {isCoach
                    ? "Certifications / qualifications"
                    : "License / qualifications"}
                </Label>
                <Textarea
                  value={certification}
                  onChange={(e) => setCertification(e.target.value)}
                  placeholder={
                    isCoach
                      ? "Example: ICF Training, Coaching Certificate, Psychology Degree"
                      : "Example: Licensed Therapist, Counselling Certificate, Psychology Degree"
                  }
                  rows={4}
                />
              </div>

              <div>
                <Label>Service areas</Label>
                <Textarea
                  value={serviceAreas}
                  onChange={(e) => setServiceAreas(e.target.value)}
                  placeholder="Example: Lagos, Abuja, Online Worldwide"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={goBack}>
                Back
              </Button>
              <Button onClick={goNext}>Continue</Button>
            </div>
          </div>
        )}

        {isCreator && step === 5 && (
          <div className="mx-auto max-w-3xl space-y-6 rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-8">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">
                <Sparkles className="h-3.5 w-3.5" />
                Creator brand setup
              </div>

              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Brand and business details
              </h2>

              <p className="text-sm leading-6 text-slate-600">
                Add the business details for your creator storefront.
              </p>
            </div>

            <div>
              <Label>Brand / business name</Label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Example: Elevate Learning Studio"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <Label>Business email</Label>
                <Input
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  placeholder="Example: hello@yourbrand.com"
                />
              </div>

              <div>
                <Label>Business phone</Label>
                <Input
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  placeholder="Add a business phone number"
                />
              </div>
            </div>

            <div>
              <Label>Website / portfolio</Label>
              <Input
                value={businessWebsite}
                onChange={(e) => setBusinessWebsite(e.target.value)}
                placeholder="Example: yourbrand.com"
              />
            </div>

            <div>
              <Label>Business address</Label>
              <Textarea
                value={businessAddress}
                onChange={(e) => setBusinessAddress(e.target.value)}
                placeholder="Add your business address if applicable"
                rows={4}
              />
            </div>

            <div>
              <Label>Brand description</Label>
              <Textarea
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                placeholder="Explain your brand, the type of learning content you produce, and the audience you serve"
                rows={5}
              />
            </div>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={goBack}>
                Back
              </Button>
              <Button onClick={finishOnboarding} disabled={loading}>
                {loading ? "Saving..." : "Finish"}
              </Button>
            </div>
          </div>
        )}

        {isProviderRole && step === 6 && (
          <div className="mx-auto max-w-3xl space-y-6 rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-8">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                <Globe2 className="h-3.5 w-3.5" />
                Final booking setup
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                How do you offer your services?
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                Choose how clients can work with you.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  value: "online",
                  title: "Online only",
                  description:
                    "Meet clients remotely by video, call, or secure online sessions.",
                },
                {
                  value: "in_person",
                  title: "In person only",
                  description:
                    "See clients physically at your office, clinic, studio, or service location.",
                },
                {
                  value: "both",
                  title: "Online and in person",
                  description:
                    "Let clients choose between remote and face-to-face sessions during booking.",
                },
              ].map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() =>
                    setServiceDeliveryMode(
                      mode.value as "online" | "in_person" | "both"
                    )
                  }
                  className={`rounded-[24px] border p-5 text-left transition ${
                    serviceDeliveryMode === mode.value
                      ? "border-emerald-500 bg-emerald-50 shadow-sm ring-2 ring-emerald-100"
                      : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
                      <Briefcase className="h-5 w-5 text-slate-700" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-950">
                        {mode.title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        {mode.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="grid gap-5 rounded-[24px] border border-slate-200 bg-slate-50/80 p-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Booking calendar setup</Label>
                <Select
                  value={calendarMode}
                  onValueChange={(
                    value: "open_schedule" | "provider_calendar"
                  ) => setCalendarMode(value)}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Choose booking flow" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_CALENDAR_MODE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Service note for clients</Label>
                <Input
                  value={meetingPreference}
                  onChange={(e) => setMeetingPreference(e.target.value)}
                  placeholder="Example: Sessions are held on Zoom and in Lekki Phase 1 by appointment"
                  className="bg-white"
                />
              </div>

              {serviceDeliveryMode !== "online" && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Real office address</Label>
                  <Textarea
                    value={officeAddress}
                    onChange={(e) => setOfficeAddress(e.target.value)}
                    placeholder="Enter your full real office, clinic, or studio address"
                    rows={4}
                    className="bg-white"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={goBack}>
                Back
              </Button>
              <Button type="button" onClick={goNext} disabled={loading}>
                Continue to review
              </Button>
            </div>
          </div>
        )}

        {isProviderRole && step === 7 && (
          <div className="mx-auto max-w-3xl space-y-6 rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] md:p-8">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                <Globe2 className="h-3.5 w-3.5" />
                Final profile review
              </div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Review your public profile before finishing
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                This review now mirrors the same provider details the public profile uses after onboarding.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                <div className="flex items-start gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-full border border-slate-200 bg-white">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt={fullName || "Profile"} className="h-full w-full object-cover" />
                    ) : null}
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold text-slate-950">{fullName || "-"}</h3>
                    <p className="text-sm text-slate-600">{profession || headline || "-"}</p>
                    <p className="text-sm text-slate-500">
                      {[city, country].filter(Boolean).join(", ") || "Location not set"}
                    </p>
                    <p className="text-sm text-slate-500">{languages || "-"}</p>
                  </div>
                </div>

                <div className="space-y-3 text-sm leading-7 text-slate-700">
                  <div>
                    <p className="font-semibold text-slate-950">Headline</p>
                    <p>{headline || "-"}</p>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-950">About</p>
                    <p>{bio || "-"}</p>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-950">Approach / Experience</p>
                    <p>{experience || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-[24px] border border-slate-200 bg-white p-5">
                <div className="space-y-3 text-sm text-slate-700">
                  <p><span className="font-semibold text-slate-950">Specialization:</span> {resolvedSpecialization || "-"}</p>
                  <p><span className="font-semibold text-slate-950">Services offered:</span> {servicesOffered || "-"}</p>
                  <p><span className="font-semibold text-slate-950">Works with:</span> {worksWith || "-"}</p>
                  <p><span className="font-semibold text-slate-950">Expertise areas:</span> {expertiseAreas || "-"}</p>
                  <p><span className="font-semibold text-slate-950">Service areas:</span> {serviceAreas || "-"}</p>
                  <p><span className="font-semibold text-slate-950">Delivery mode:</span> {serviceDeliveryMode === "in_person" ? "In person only" : serviceDeliveryMode === "both" ? "Online and in person" : "Online only"}</p>
                  <p><span className="font-semibold text-slate-950">Calendar mode:</span> {calendarMode === "open_schedule" ? "Open schedule" : "Provider booking calendar"}</p>
                  <p><span className="font-semibold text-slate-950">Client note:</span> {meetingPreference || "-"}</p>
                  <p><span className="font-semibold text-slate-950">Office address:</span> {serviceDeliveryMode === "online" ? "Online only" : officeAddress || "-"}</p>
                  <p><span className="font-semibold text-slate-950">Phone released after booking:</span> {enablePhoneRelease ? "Yes" : "No"}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={goBack}>
                Back
              </Button>
              <Button type="button" onClick={finishOnboarding} disabled={loading}>
                {loading ? "Saving..." : "Finish"}
              </Button>
            </div>
          </div>
        )}

        {isLearner && step === 4 && (
          <div className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-6">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Review and finish
              </h2>
              <p className="text-sm text-muted-foreground">
                Confirm your learner details and complete onboarding.
              </p>
            </div>

            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <p>
                <span className="font-medium text-foreground">Goal:</span>{" "}
                {resolvedLearnerGoal || "-"}
              </p>
              <p>
                <span className="font-medium text-foreground">
                  Looking forward to:
                </span>{" "}
                {learnerLookingForward || "-"}
              </p>
              <p>
                <span className="font-medium text-foreground">Interests:</span>{" "}
                {learnerInterests || "-"}
              </p>
              <p>
                <span className="font-medium text-foreground">Full name:</span>{" "}
                {fullName || "-"}
              </p>
              <p>
                <span className="font-medium text-foreground">Country:</span>{" "}
                {country || "-"}
              </p>
              <p>
                <span className="font-medium text-foreground">Image:</span>{" "}
                {avatarFile ? avatarFile.name : avatarPreview ? "Uploaded" : "-"}
              </p>
            </div>

            <div className="flex justify-between pt-2">
              <Button type="button" variant="outline" onClick={goBack}>
                Back
              </Button>
              <Button onClick={finishOnboarding} disabled={loading}>
                {loading ? "Saving..." : "Finish"}
              </Button>
            </div>
          </div>
        )}
      </ScrollableContent>
    </div>
  );
};

export default Onboarding;