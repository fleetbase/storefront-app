import HeaderButton from './HeaderButton';
import { useNavigation } from '@react-navigation/native';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

const BackButton = ({ ...props }) => {
    const navigation = useNavigation();
    const { onPress } = props;

    const handlePress = function () {
        if (typeof onPress === 'function') {
            onPress();
        } else {
            navigation.goBack();
        }
    };

    return <HeaderButton onPress={handlePress} icon={faArrowLeft} {...props} />;
};

export default BackButton;
