export interface PrivacyAnalysisResult {
  status: 'approved_for_aggregation' | 'needs_sanitization' | 'held_for_privacy_review' | 'rejected';
  privacyFlags: string[];
  sanitizedContent?: string;
  isSeriousAllegation: boolean;
  explanation: string[];
}

export class PrivacyRiskGate {
  // Direct Identifier Patterns
  private static EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  private static PHONE_REGEX = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}\b|\b\d{3}[-.]\d{4}\b/g;
  private static STUDENT_ID_REGEX = /\b(?:STU|ID|S|202[0-9])[-_]?\d{4,8}\b|\b\d{7,9}\b/gi;
  
  // Specific Names (Demo triggers & common titles)
  private static KNOWN_NAMES = [
    'john doe', 'jane smith', 'dr. smith', 'prof. johnson', 'professor williams',
    'dean roberts', 'principal brown', 'chancellor green', 'supervisor davis',
    'robert miller', 'sarah jenkins'
  ];

  // Contextual Risk Patterns (Dates, Rooms, Course Codes, Small Group Identifiers)
  private static DATE_PATTERNS = [
    /\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(?:st|nd|rd|th)?(?:,\s*\d{4})?\b/gi,
    /\b\d{1,2}\/\d{1,2}\/(?:20\d{2}|\d{2})\b/g,
    /\b(?:yesterday|last tuesday|last friday|this morning|at 3:15pm|at 4pm)\b/gi
  ];

  private static LOCATION_PATTERNS = [
    /\b(?:room|office|lab|building|hall)\s+[a-z0-9-]+\b/gi,
    /\b(?:block\s+[a-z]|cabin\s+\d+)\b/gi
  ];

  private static COURSE_CODE_PATTERNS = [
    /\b[A-Z]{2,4}\s?\d{3,4}\b/g // e.g. CS101, MATH302, ENG201
  ];

  // Serious Allegations Patterns (Harassment, assault, safety threat, bribery)
  private static SERIOUS_ALLEGATION_PATTERNS = [
    /\b(?:harassment|harassed|assault|assaulted|threat|threatened|bribe|bribery|extortion|discrimination|hazing|stalking|physical violence)\b/gi
  ];

  public static analyzeReport(content: string): PrivacyAnalysisResult {
    const flags: string[] = [];
    const explanations: string[] = [];
    let sanitizedText = content;
    let isSeriousAllegation = false;

    // 1. Direct Identifier Checks
    const emailMatches = content.match(this.EMAIL_REGEX);
    if (emailMatches) {
      flags.push('DIRECT_IDENTIFIER:EMAIL');
      explanations.push(`Found direct identifier (Email): ${emailMatches.join(', ')}`);
      sanitizedText = sanitizedText.replace(this.EMAIL_REGEX, '[REDACTED EMAIL]');
    }

    const phoneMatches = content.match(this.PHONE_REGEX);
    if (phoneMatches) {
      flags.push('DIRECT_IDENTIFIER:PHONE');
      explanations.push(`Found direct identifier (Phone number): ${phoneMatches.join(', ')}`);
      sanitizedText = sanitizedText.replace(this.PHONE_REGEX, '[REDACTED PHONE]');
    }

    const studentIdMatches = content.match(this.STUDENT_ID_REGEX);
    if (studentIdMatches) {
      flags.push('DIRECT_IDENTIFIER:STUDENT_ID');
      explanations.push(`Found direct identifier (Student ID): ${studentIdMatches.join(', ')}`);
      sanitizedText = sanitizedText.replace(this.STUDENT_ID_REGEX, '[REDACTED STUDENT ID]');
    }

    const lowerContent = content.toLowerCase();
    for (const name of this.KNOWN_NAMES) {
      if (lowerContent.includes(name)) {
        flags.push('DIRECT_IDENTIFIER:NAME');
        explanations.push(`Found specific personal name reference: "${name}"`);
        const nameRegex = new RegExp(name.replace('.', '\\.'), 'gi');
        sanitizedText = sanitizedText.replace(nameRegex, '[REDACTED NAME]');
      }
    }

    // 2. Contextual Identifiers (Dates, Rooms, Courses)
    for (const dateRegex of this.DATE_PATTERNS) {
      const dateMatches = content.match(dateRegex);
      if (dateMatches) {
        flags.push('CONTEXTUAL_RISK:SPECIFIC_DATE');
        explanations.push(`Specific date/time mentioned (${dateMatches.join(', ')}) which narrows down reporter identity.`);
      }
    }

    for (const locRegex of this.LOCATION_PATTERNS) {
      const locMatches = content.match(locRegex);
      if (locMatches) {
        flags.push('CONTEXTUAL_RISK:SPECIFIC_LOCATION');
        explanations.push(`Specific room/location reference (${locMatches.join(', ')}) may identify involved individuals.`);
      }
    }

    for (const courseRegex of this.COURSE_CODE_PATTERNS) {
      const courseMatches = content.match(courseRegex);
      if (courseMatches) {
        flags.push('CONTEXTUAL_RISK:COURSE_CODE');
        explanations.push(`Course/Class code mentioned (${courseMatches.join(', ')}).`);
      }
    }

    // 3. Serious Allegation Check
    for (const seriousRegex of this.SERIOUS_ALLEGATION_PATTERNS) {
      const seriousMatches = content.match(seriousRegex);
      if (seriousMatches) {
        isSeriousAllegation = true;
        flags.push('SERIOUS_ALLEGATION');
        explanations.push(`Contains serious allegation keywords (${seriousMatches.join(', ')}). Requires independent ethics committee handling.`);
      }
    }

    // Determine final status
    let status: PrivacyAnalysisResult['status'] = 'approved_for_aggregation';

    if (isSeriousAllegation || flags.some(f => f.startsWith('CONTEXTUAL_RISK'))) {
      // If contextual risk or serious allegation, hold for human privacy review
      status = 'held_for_privacy_review';
    } else if (flags.some(f => f.startsWith('DIRECT_IDENTIFIER'))) {
      // Direct identifiers present: needs sanitization
      status = 'needs_sanitization';
    }

    return {
      status,
      privacyFlags: flags,
      sanitizedContent: sanitizedText !== content ? sanitizedText : undefined,
      isSeriousAllegation,
      explanation: explanations,
    };
  }
}
