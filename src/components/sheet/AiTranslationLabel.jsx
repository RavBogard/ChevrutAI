import React from 'react';
import PropTypes from 'prop-types';

const AiTranslationLabel = ({ isAramaic, confidence }) => (
    <div className="ai-translation-badge">
        <span className="ai-translation-badge__icon" aria-hidden="true">✦</span>
        <span className="ai-translation-badge__text">AI Translation</span>
        {isAramaic && (
            <span className="ai-translation-badge__aramaic">
                (Aramaic text — verify with scholar)
            </span>
        )}
        {confidence === 'low' && (
            <span className="ai-translation-badge__uncertainty">
                · Some passages uncertain
            </span>
        )}
    </div>
);

AiTranslationLabel.propTypes = {
    isAramaic: PropTypes.bool,
    confidence: PropTypes.string,
};

export default AiTranslationLabel;
