# CSI605Project

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.27.

## Final Documentation:
https://github.com/KeletsoJoyDitlhotlhole/CSI605-Project_Implementation/blob/main/CSI605%20Project-%20Final%20Documentation.pdf

## File Structure and Implementation Overview Documentation:

## Roles and Responsibilities
https://github.com/KeletsoJoyDitlhotlhole/CSI605-Project_Implementation/blob/main/CSI605-Overview%20Of%20Implementation.pdf

### Keletso Joy Ditlhotlhole – Group Leader / Frontend Development
Served as the group leader, coordinating team activities and ensuring an organised development process, including maintaining order within the shared repository. She contributed to UI design and frontend implementation and was specifically responsible for preparing the documentation and repository structure summary for the project documentation.

### Kgosi Zilwa – Authentication and Access Control
Primarily responsible for implementing authentication and role-based access control, ensuring that users had the appropriate permissions to access system pages and core functionality, particularly administrator features and restricted pages.

### Phazha Chakalisa – Backend Development
Primarily contributed to the development and implementation of backend functionality supporting the system’s core features.

### Archibald Mareme – Backend Development
Primarily contributed to backend development and integration, ensuring that server-side functionality supported the required system operations.

### Kagiso Mpopang – Backend Development
Primarily contributed to the implementation and integration of backend functionality required by the system.

### Entire Team – Documentation, Backend, Integration and Maintenance
The entire team collaboratively contributed to project documentation, backend development, system integration and maintenance. Team members participated in testing, troubleshooting, resolving implementation issues, refining functionality, and ensuring that the frontend, backend, authentication, database and other system components worked together correctly.



## Installation

Install the project dependencies before running the app for the first time:

```bash
npm install
```

## PDF report export (required)

The admin report can be downloaded as **CSV** or **PDF**. The PDF export uses the `jspdf` and `jspdf-autotable` libraries, so run this command first or the **Download PDF** button will not work:

```bash
npm install jspdf jspdf-autotable
```

If the build shows CommonJS dependency warnings (for example `html2canvas`, `canvg` or `dompurify`), add those names to `allowedCommonJsDependencies` in `angular.json`.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.


---

## Email Notifications & MailHog

The system automatically sends email notifications using the email addresses stored in the PostgreSQL database (`Users.email`).

All outgoing emails in development are intercepted by **MailHog**:
- **MailHog SMTP Port**: `1025`
- **MailHog Web UI**: [http://localhost:8025](http://localhost:8025)

### Notification Triggers:
1. **Student Submission Confirmation**: When a student submits a manuscript (e.g. Master's Thesis or PhD Dissertation), a confirmation email with the publication reference, publication type, track, status, and assigned reviewer details is sent to the student's email.
2. **Reviewer Assignment Notice**: The assigned supervisor/lecturer receives an email alerting them that a new student publication has been assigned to their review queue.
3. **Review Decision Notice**: When the reviewing lecturer records an Approved or Rejected review, the student receives an email with the decision and reviewer feedback.
