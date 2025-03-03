import React, { useState, useEffect } from 'react';
import { SvgXml } from 'react-native-svg';

export function SvgCssUri({ uri, ...props }) {
    const [svgXml, setSvgXml] = useState(null);

    useEffect(() => {
        async function fetchSvg() {
            try {
                const response = await fetch(uri);
                const text = await response.text();
                setSvgXml(text);
            } catch (error) {
                console.error('Error fetching SVG:', error);
            }
        }
        fetchSvg();
    }, [uri]);

    if (!svgXml) {
        return null; // or a loader placeholder
    }

    return <SvgXml xml={svgXml} {...props} />;
}
