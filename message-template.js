/**
 * Email notification template helper
 * This file provides a consistent way to format email notifications
 */

/**
 * Creates a success notification message
 * @param {Object} params Parameters for the message
 * @returns {String} Formatted message
 */
function createSuccessMessage(params) {
  return `The Jenkins pipeline build #${params.buildNumber} has completed successfully.

Build Version: ${params.version}
Branch: ${params.branch}
Repository: ${params.repo}

All stages completed successfully.

Best regards,
Jenkins CI/CD Pipeline`;
}

/**
 * Creates a failure notification message
 * @param {Object} params Parameters for the message
 * @returns {String} Formatted message
 */
function createFailureMessage(params) {
  return `The Jenkins pipeline build #${params.buildNumber} has failed.

Build Version: ${params.version}
Branch: ${params.branch}
Repository: ${params.repo}

Please check the Jenkins logs for details.

Best regards,
Jenkins CI/CD Pipeline`;
}

module.exports = {
  createSuccessMessage,
  createFailureMessage
};
