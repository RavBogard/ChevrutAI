import React from 'react';

const SkeletonLoader = ({ count = 3, style = {} }) => {
    return (
        <div className="skeleton-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', ...style }}>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="skeleton"
                    style={{
                        height: '20px',
                        width: i === count - 1 ? '70%' : '100%',
                        borderRadius: '4px'
                    }}
                />
            ))}
        </div>
    );
};

export default SkeletonLoader;
